import mongoose from "mongoose";
import Activity from "../models/Activity.js";
import Story from "../models/Story.js";
import Topic from "../models/Topic.js";
import User from "../models/User.js";
import { slugify } from "../utils/slugify.js";

function parsePagination(query) {
  const page = Math.max(Number.parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(Number.parseInt(query.limit, 10) || 20, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listStories(request, response) {
  const { page, limit, skip } = parsePagination(request.query);
  const filter = {};

  if (request.authUser?.role === "admin") {
    if (["draft", "published"].includes(request.query.status)) filter.status = request.query.status;
  } else {
    filter.status = "published";
  }
  if (request.query.topic) {
    if (mongoose.isValidObjectId(request.query.topic)) {
      filter.topic = request.query.topic;
    } else {
      const topic = await Topic.findOne({ slug: String(request.query.topic).toLowerCase() }).select("_id");
      filter.topic = topic?._id ?? null;
    }
  }
  if (request.query.q) {
    const keyword = escapeRegex(String(request.query.q).trim());
    filter.$or = [
      { title: { $regex: keyword, $options: "i" } },
      { description: { $regex: keyword, $options: "i" } },
    ];
  }

  const [stories, total] = await Promise.all([
    Story.find(filter).populate("topic", "name slug").sort({ createdAt: -1 }).skip(skip).limit(limit),
    Story.countDocuments(filter),
  ]);

  response.json({ success: true, data: stories, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
}

export async function getStory(request, response) {
  const filter = { _id: request.params.id };
  if (request.authUser?.role !== "admin") filter.status = "published";
  const story = await Story.findOne(filter).populate("topic", "name slug");
  if (!story) return response.status(404).json({ success: false, message: "Story not found." });
  response.json({ success: true, data: story });
}

export async function getStoryBySlug(request, response) {
  const filter = { slug: request.params.slug };
  if (request.authUser?.role !== "admin") filter.status = "published";
  const story = await Story.findOneAndUpdate(filter, { $inc: { views: 1 } }, { new: true })
    .populate("topic", "name slug");
  if (!story) return response.status(404).json({ success: false, message: "Story not found." });
  response.json({ success: true, data: story });
}

export async function createStory(request, response) {
  const values = { ...request.body };
  values.slug = slugify(values.slug || values.title);
  if (!values.slug) return response.status(400).json({ success: false, message: "Story title or slug is required." });

  const topic = await Topic.findById(values.topic);
  if (!topic) return response.status(400).json({ success: false, message: "A valid topic is required." });

  const story = await Story.create(values);
  await story.populate("topic", "name slug");
  response.status(201).json({ success: true, data: story });
}

export async function updateStory(request, response) {
  const values = { ...request.body };
  if (values.title || values.slug) values.slug = slugify(values.slug || values.title);
  if (values.topic && !(await Topic.exists({ _id: values.topic }))) {
    return response.status(400).json({ success: false, message: "A valid topic is required." });
  }

  const story = await Story.findByIdAndUpdate(request.params.id, values, {
    new: true,
    runValidators: true,
  }).populate("topic", "name slug");
  if (!story) return response.status(404).json({ success: false, message: "Story not found." });
  response.json({ success: true, data: story });
}

export async function deleteStory(request, response) {
  const story = await Story.findByIdAndDelete(request.params.id);
  if (!story) return response.status(404).json({ success: false, message: "Story not found." });
  response.json({ success: true, message: "Story deleted." });
}

export async function completeStory(request, response) {
  const story = await Story.findOne({ _id: request.params.storyId, status: "published" });
  if (!story) return response.status(404).json({ success: false, message: "Published Story not found." });

  const user = await User.findById(request.authUser._id);
  const alreadyCompleted = user.learnedStories.some((id) => String(id) === String(story._id));
  const now = new Date();
  if (!alreadyCompleted) user.learnedStories.push(story._id);

  if (!user.lastStudyAt || now.toDateString() !== user.lastStudyAt.toDateString()) {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    user.streakDays = user.lastStudyAt?.toDateString() === yesterday.toDateString()
      ? user.streakDays + 1
      : 1;
    user.lastStudyAt = now;
  }

  await user.save();
  if (!alreadyCompleted) {
    await Activity.create({ user: user._id, story: story._id, action: "story_completed" });
  }

  response.json({ success: true, data: { completed: true, streakDays: user.streakDays } });
}