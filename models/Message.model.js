import mongoose from "mongoose";

const chatSchema = mongoose.Schema(
  {
    content: {
      type: String,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    chat: {
      type: String,
    },
    attachments: [
      {
        public_id: {
          type: String,
          require: true,
        },
        url: {
          type: String,
          require: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

export const Message = mongoose.model("Message", chatSchema);
