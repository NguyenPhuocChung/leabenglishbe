import Activity from "../models/Activity.js";
import Story from "../models/Story.js";
import Topic from "../models/Topic.js";
import User from "../models/User.js";

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function relativeTime(date) {
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

export async function getDashboard(request, response) {
  const now = new Date();
  const weekStart = startOfDay(now);
  weekStart.setDate(weekStart.getDate() - 6);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [totalUsers, newUsers, totalStories, publishedStories, totalTopics, activeTopics, registrations, popularStories, activities, weeklyActivityCounts] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: "student", createdAt: { $gte: monthStart } }),
    Story.countDocuments(),
    Story.countDocuments({ status: "published" }),
    Topic.countDocuments(),
    Topic.countDocuments({ status: "active" }),
    User.aggregate([
      { $match: { role: "student", createdAt: { $gte: weekStart } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
    ]),
    Story.find({ status: "published" }).populate("topic", "name").sort({ views: -1 }).limit(5).lean(),
    Activity.find().populate("user", "name").populate("story", "title").sort({ createdAt: -1 }).limit(8).lean(),
    Activity.aggregate([
      { $match: { createdAt: { $gte: weekStart } } },
      { $group: { _id: "$action", count: { $sum: 1 } } },
    ]),
  ]);

  const countsByDate = new Map(registrations.map((item) => [item._id, item.count]));
  const registrationsByDay = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      label: date.toLocaleDateString("vi-VN", { weekday: "short" }),
      count: countsByDate.get(key) ?? 0,
    };
  });

  const recentActivity = activities.map((activity) => ({
    id: String(activity._id),
    title: activity.action === "story_completed"
      ? `${activity.user?.name ?? "Người học"} hoàn thành Story`
      : `${activity.user?.name ?? "Người học"} lưu từ mới`,
    detail: activity.action === "story_completed" ? activity.story?.title ?? "Story" : activity.word,
    type: activity.action === "story_completed" ? "story" : "vocab",
    time: relativeTime(activity.createdAt),
    createdAt: activity.createdAt,
  }));
  const weeklyCounts = Object.fromEntries(weeklyActivityCounts.map((item) => [item._id, item.count]));

  response.json({
    success: true,
    data: {
      stats: { totalUsers, newUsers, totalStories, publishedStories, totalTopics, activeTopics },
      registrationsByDay,
      popularStories,
      recentActivity,
      weeklyActivity: {
        completions: weeklyCounts.story_completed ?? 0,
        vocabularySaves: weeklyCounts.vocabulary_saved ?? 0,
      },
    },
  });
}