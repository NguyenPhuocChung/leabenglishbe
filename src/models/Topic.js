import mongoose from "mongoose";

const topicSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    description: { type: String, trim: true, default: "", maxlength: 500 },
    status: { type: String, enum: ["active", "inactive"], default: "active" },
  },
  { timestamps: true },
);

export default mongoose.model("Topic", topicSchema);