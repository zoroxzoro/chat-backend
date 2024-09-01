import { TryCatch } from "../middleware/errorMiddleware.js";
import { User } from "../models/User.model.js";
import { Chat } from "../models/Chat.model.js";
import { Message } from "../models/Message.model.js";
import { cookieOptions } from "../utils/features.js";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { ErrorHandler } from "../utils/utils.js";
import { adminSecretKey } from "../index.js";
dotenv.config();
export const getAllUser = TryCatch(async (req, res, next) => {
  const users = await User.find({}).select("-password");

  const transformedUsers = await Promise.all(
    users.map(async ({ name, username, avatar, _id }) => {
      const [groups, friends] = await Promise.all([
        Chat.countDocuments({ groupChat: true, members: _id }),
        Chat.countDocuments({ groupChat: false, members: _id }),
      ]);

      return {
        name,
        username,
        avatar: avatar.url,
        _id,
        groups,
        friends,
      };
    })
  );

  return res.status(200).json({
    success: true,
    transformedUsers,
  });
});

export const getAllChat = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({})
    .populate("members", "name avatar")
    .populate("creator", "name avatar");

  const transformedChats = await Promise.all(
    chats.map(async ({ members, _id, groupChat, name, creator }) => {
      const totalMessages = await Message.countDocuments({ chat: _id });

      return {
        _id,
        groupChat,
        name,
        avatar: members.slice(0, 3).map((member) => member.avatar.url),
        members: members.map(({ _id, name, avatar }) => ({
          _id,
          name,
          avatar: avatar.url,
        })),
        creator: {
          name: creator?.name || "None",
          avatar: creator?.avatar.url || "",
        },
        totalMembers: members.length,
        totalMessages,
      };
    })
  );

  return res.status(200).json({
    success: true,
    transformedChats,
  });
});

export const allMessages = TryCatch(async (req, res) => {
  const messages = await Message.find({})
    .populate("sender", "name avatar")
    .populate("chat", "groupChat");

  const transformedMessages = messages.map(
    ({ content, attachments, _id, sender, createdAt, chat }) => ({
      _id,
      attachments,
      content,
      createdAt,
      chat: chat._id,
      groupChat: chat.groupChat,
      sender: {
        _id: sender._id,
        name: sender.name,
        avatar: sender.avatar.url,
      },
    })
  );

  return res.status(200).json({
    success: true,
    messages: transformedMessages,
  });
});

export const dashboardStats = TryCatch(async (req, res) => {
  const [groupCount, userCount, messagesCount, totalCount] = await Promise.all([
    Chat.countDocuments({ groupChat: true }),
    User.countDocuments({}),
    Message.countDocuments({}),
    Chat.countDocuments({}),
  ]);

  const today = new Date();
  const get7days = new Date(today.setDate(today.getDate() - 7));

  const last7DaysMessages = await Message.find({
    createdAt: { $gte: get7days, $lte: today },
  });
  const messages = new Array(7).fill(0);
  last7DaysMessages.forEach((message) => {
    const indexApprox =
      (today.getTime() - message.createdAt.getTime()) / dayInMiliseconds;
    const index = Math.floor(indexApprox);

    messages[6 - index]++;
  });
  const stats = {
    groupCount,
    userCount,
    messagesCount,
    totalCount,
    messages,
  };
  res.status(200).json({
    sucess: true,
    stats,
  });
});

export const adminLogin = TryCatch(async (req, res, next) => {
  const { secretKey } = req.body;

  console.log(secretKey, adminSecretKey);
  const isMatched = secretKey === adminSecretKey;

  if (!isMatched) return next(new ErrorHandler("Invalid Admin Key", 401));

  const token = jwt.sign(secretKey, process.env.JWT_SECRET);

  return res
    .status(200)
    .cookie("homies-admin-token", token, {
      ...cookieOptions,
      maxAge: 1000 * 60 * 15,
    })
    .json({
      success: true,
      message: "Authenticated Successfully, Welcome BOSS",
    });
});

export const adminLogout = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("chattu-admin-token", "", {
      ...cookieOptions,
      maxAge: 0,
    })
    .json({
      success: true,
      message: "Logged Out Successfully",
    });
});
