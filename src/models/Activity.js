import mongoose from "mongoose";

const activitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, enum: ["story_completed", "vocabulary_saved"], required: true },
    story: { type: mongoose.Schema.Types.ObjectId, ref: "Story", default: null },
    word: { type: String, trim: true, lowercase: true, default: "" },
  },
  { timestamps: true },
);

activitySchema.index({ createdAt: -1 });

export default mongoose.model("Activity", activitySchema);