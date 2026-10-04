import Activity from "../models/Activity.js";
import User from "../models/User.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeUser(user) {
  const learnedStories = user.learnedStories ?? [];
  const savedVocabulary = user.savedVocabulary ?? [];
  return {
    ...user,
    id: String(user._id),
    status: user.status === "active" ? "Active" : "Blocked",
    stories: learnedStories.length,
    vocabulary: savedVocabulary.length,
    completed: learnedStories.length,
    streak: user.streakDays ?? 0,
    joinedAt: user.createdAt?.toLocaleDateString("vi-VN") ?? "",
  };
}

export async function listUsers(request, response) {
  const page = Math.max(Number.parseInt(request.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(request.query.limit, 10) || 20, 1), 100);
  const filter = { role: "student" };
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  if (["active", "blocked"].includes(request.query.status)) filter.status = request.query.status;
  if (request.query.q) {
    const search = escapeRegex(String(request.query.q).trim());
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const [users, total, totalUsers, activeUsers, newUsers] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "student", status: "active" }),
    User.countDocuments({ role: "student", createdAt: { $gte: monthStart } }),
  ]);
  response.json({
    success: true,
    data: users.map(serializeUser),
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    stats: { totalUsers, activeUsers, newUsers },
  });
}

export async function getUser(request, response) {
  const user = await User.findById(request.params.id).populate("learnedStories", "title slug level status").lean();
  if (!user) return response.status(404).json({ success: false, message: "User not found." });
  response.json({ success: true, data: serializeUser(user) });
}

export async function updateUserStatus(request, response) {
  const { status } = request.body;
  if (!["active", "blocked"].includes(status)) {
    return response.status(400).json({ success: false, message: "Status must be active or blocked." });
  }

  const user = await User.findByIdAndUpdate(
    request.params.id,
    { $set: { status }, $inc: { tokenVersion: 1 } },
    { new: true, runValidators: true },
  ).lean();
  if (!user) return response.status(404).json({ success: false, message: "User not found." });
  response.json({ success: true, data: serializeUser(user) });
}

export async function deleteUser(request, response) {
  const user = await User.findByIdAndDelete(request.params.id);
  if (!user) return response.status(404).json({ success: false, message: "User not found." });
  await Activity.deleteMany({ user: user._id });
  response.json({ success: true, message: "User deleted." });
}

export async function getMyProgress(request, response) {
  const user = await User.findById(request.authUser._id)
    .populate("learnedStories", "title slug level status")
    .lean();
  if (!user) return response.status(404).json({ success: false, message: "User not found." });
  const vocabularyByWord = new Map((user.vocabularyEntries ?? []).map((entry) => [entry.word, entry]));
  const vocabularyEntries = (user.savedVocabulary ?? []).map((word) => vocabularyByWord.get(word) ?? {
    word,
    phonetic: "",
    meanings: [],
    tags: [],
    status: "new",
    savedAt: user.createdAt,
    lastReviewedAt: null,
  });
  response.json({
    success: true,
    data: {
      user: { id: String(user._id), name: user.name, email: user.email },
      learnedStories: user.learnedStories ?? [],
      savedVocabulary: user.savedVocabulary ?? [],
      vocabularyEntries,
      completedStories: user.learnedStories?.length ?? 0,
      savedWords: user.savedVocabulary?.length ?? 0,
      streakDays: user.streakDays ?? 0,
      lastStudyAt: user.lastStudyAt,
    },
  });
}

export async function saveMyVocabulary(request, response) {
  const word = String(request.body.word ?? "").trim().toLowerCase();
  if (!word || word.length > 100) {
    return response.status(400).json({ success: false, message: "A word up to 100 characters is required." });
  }

  const user = await User.findById(request.authUser._id);
  const alreadySaved = user.savedVocabulary.includes(word);
  let entry = user.vocabularyEntries.find((item) => item.word === word);
  const meanings = Array.isArray(request.body.meanings)
    ? request.body.meanings.slice(0, 5).map((meaning) => ({
      type: String(meaning.type ?? "Từ vựng").slice(0, 50),
      meaning: String(meaning.meaning ?? "").slice(0, 500),
    })).filter((meaning) => meaning.meaning)
    : [];
  const tags = Array.isArray(request.body.tags)
    ? request.body.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 10)
    : [];

  if (!alreadySaved) user.savedVocabulary.push(word);
  if (!entry) {
    entry = user.vocabularyEntries.create({
      word,
      phonetic: String(request.body.phonetic ?? "").slice(0, 100),
      meanings,
      tags,
    });
    user.vocabularyEntries.push(entry);
  } else {
    if (!entry.meanings.length && meanings.length) entry.meanings = meanings;
    if (!entry.phonetic && request.body.phonetic) entry.phonetic = String(request.body.phonetic).slice(0, 100);
    if (!entry.tags.length && tags.length) entry.tags = tags;
  }
  await user.save();
  if (!alreadySaved) await Activity.create({ user: user._id, action: "vocabulary_saved", word });

  response.json({ success: true, data: { word, alreadySaved, savedWords: user.savedVocabulary.length } });
}

export async function updateMyVocabularyStatus(request, response) {
  const word = String(request.params.word ?? "").trim().toLowerCase();
  const { status } = request.body;
  if (!["new", "learning", "mastered"].includes(status)) {
    return response.status(400).json({ success: false, message: "Status must be new, learning, or mastered." });
  }

  const user = await User.findById(request.authUser._id);
  if (!user.savedVocabulary.includes(word)) {
    return response.status(404).json({ success: false, message: "Saved vocabulary word not found." });
  }

  let entry = user.vocabularyEntries.find((item) => item.word === word);
  if (!entry) {
    user.vocabularyEntries.push({ word, status, lastReviewedAt: new Date() });
    entry = user.vocabularyEntries[user.vocabularyEntries.length - 1];
  } else {
    entry.status = status;
    entry.lastReviewedAt = new Date();
  }
  await user.save();

  response.json({ success: true, data: { word, status: entry.status, lastReviewedAt: entry.lastReviewedAt } });
}

export async function removeMyVocabulary(request, response) {
  const word = String(request.params.word ?? "").trim().toLowerCase();
  const user = await User.findById(request.authUser._id);
  const hadWord = user.savedVocabulary.includes(word);
  user.savedVocabulary = user.savedVocabulary.filter((item) => item !== word);
  user.vocabularyEntries = user.vocabularyEntries.filter((entry) => entry.word !== word);
  await user.save();
  if (hadWord) {
    await Activity.deleteMany({ user: user._id, action: "vocabulary_saved", word });
  }
  response.json({ success: true, data: { word, removed: hadWord, savedWords: user.savedVocabulary.length } });
}