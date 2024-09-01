import mongoose, { Types } from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    chatName: {
      type: String,
    },
    isGroupChat: {
      type: Boolean,
      default: false,
    },
    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);
export const Chat = mongoose.model("Chat", chatSchema);
