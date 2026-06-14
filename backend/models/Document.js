import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
  {
    filename: {
      type: String,
      required: true,
    },

    originalName: {
      type: String,
      required: true,
    },

    size: {
      type: Number,
    },

    mime: {
      type: String,
    },

    extractedText: {
      type: String,
    },

    summary: {
      type: String,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    expireAt: {
      type: Date,
      default: () => new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days
      index: { expires: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Document", documentSchema);