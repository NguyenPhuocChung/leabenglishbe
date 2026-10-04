import mongoose from "mongoose";

const vocabularyItemSchema = new mongoose.Schema(
  {
    word: { type: String, required: true, trim: true },
    meaning: { type: String, trim: true, default: "" },
  },
  { _id: false },
);

const storySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "", maxlength: 1000 },
    topic: { type: mongoose.Schema.Types.ObjectId, ref: "Topic", required: true },
    level: { type: String, enum: ["Beginner", "Intermediate", "Advanced"], default: "Beginner" },
    coverImage: { type: String, trim: true, default: "" },
    content: { type: String, required: true, trim: true },
    vocabulary: { type: [vocabularyItemSchema], default: [] },
    audioUrl: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["draft", "published"], default: "draft" },
    views: { type: Number, min: 0, default: 0 },
  },    
  { timestamps: true },
);

storySchema.index({ status: 1, createdAt: -1 });
storySchema.index({ topic: 1, status: 1 });

export default mongoose.model("Story", storySchema);