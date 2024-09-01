import mongoose, { Types } from "mongoose";

const requestSchema = mongoose.Schema({
  status: {
    type: String,
    default: "pending",
    emun: ["pending", "accepted", "rejected"],
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    require: true,
  },
});

export const Request = mongoose.model("Request", requestSchema);
