import mongoose from "mongoose";

const vocabularyEntrySchema = new mongoose.Schema(
  {
    word: { type: String, required: true, trim: true, lowercase: true },
    phonetic: { type: String, trim: true, default: "" },
    meanings: [{
      type: { type: String, trim: true, default: "Từ vựng" },
      meaning: { type: String, trim: true, default: "" },
    }],
    tags: [{ type: String, trim: true, lowercase: true }],
    status: { type: String, enum: ["new", "learning", "mastered"], default: "new" },
    savedAt: { type: Date, default: Date.now },
    lastReviewedAt: { type: Date, default: null },
  },
  { _id: false },
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ["student", "admin"], default: "student" },
    status: { type: String, enum: ["active", "blocked"], default: "active" },
    tokenVersion: { type: Number, default: 0 },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    learnedStories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Story" }],
    savedVocabulary: [{ type: String, trim: true, lowercase: true }],
    vocabularyEntries: { type: [vocabularyEntrySchema], default: [] },
    streakDays: { type: Number, min: 0, default: 0 },
    lastStudyAt: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model("User", userSchema);