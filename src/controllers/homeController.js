import Story from "../models/Story.js";
import Topic from "../models/Topic.js";

export async function getHomeData(request, response) {
  const [stories, topics, totalStories, totalTopics, popularStories] = await Promise.all([
    Story.find({ status: "published" })
      .populate("topic", "name slug")
      .sort({ createdAt: -1 })
      .limit(6),
    Topic.find({ status: "active" }).sort({ name: 1 }).lean(),
    Story.countDocuments({ status: "published" }),
    Topic.countDocuments({ status: "active" }),
    Story.find({ status: "published" })
      .populate("topic", "name slug")
      .sort({ views: -1, createdAt: -1 })
      .limit(4),
  ]);

  response.json({
    success: true,
    data: {
      stats: { totalStories, totalTopics },
      stories,
      featuredStory: stories[0] ?? null,
      popularStories,
      topics,
    },
  });
}