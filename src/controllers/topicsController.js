import { slugify } from "../utils/slugify.js";
import Story from "../models/Story.js";
import Topic from "../models/Topic.js";

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listTopics(request, response) {
  const filter = {};
  if (request.authUser?.role === "admin") {
    if (["active", "inactive"].includes(request.query.status)) filter.status = request.query.status;
  } else {
    filter.status = "active";
  }
  if (request.query.q) {
    filter.name = { $regex: escapeRegex(String(request.query.q).trim()), $options: "i" };
  }

  const topics = await Topic.find(filter).sort({ name: 1 }).lean();
  const counts = await Story.aggregate([
    { $group: { _id: "$topic", stories: { $sum: 1 } } },
  ]);
  const storiesByTopic = new Map(counts.map((item) => [String(item._id), item.stories]));

  response.json({
    success: true,
    data: topics.map((topic) => ({ ...topic, stories: storiesByTopic.get(String(topic._id)) ?? 0 })),
  });
}

export async function createTopic(request, response) {
  const values = { ...request.body };
  values.slug = slugify(values.slug || values.name);
  if (!values.slug) return response.status(400).json({ success: false, message: "Topic name or slug is required." });

  const topic = await Topic.create(values);
  response.status(201).json({ success: true, data: topic });
}

export async function updateTopic(request, response) {
  const values = { ...request.body };
  if (values.name || values.slug) values.slug = slugify(values.slug || values.name);

  const topic = await Topic.findByIdAndUpdate(request.params.id, values, {
    new: true,
    runValidators: true,
  });
  if (!topic) return response.status(404).json({ success: false, message: "Topic not found." });
  response.json({ success: true, data: topic });
}

export async function deleteTopic(request, response) {
  const storiesCount = await Story.countDocuments({ topic: request.params.id });
  if (storiesCount) {
    return response.status(409).json({
      success: false,
      message: "Cannot delete a topic that still has stories.",
    });
  }

  const topic = await Topic.findByIdAndDelete(request.params.id);
  if (!topic) return response.status(404).json({ success: false, message: "Topic not found." });
  response.json({ success: true, message: "Topic deleted." });
}