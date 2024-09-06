import mongoose from "mongoose";
import { TryCatch } from "../middleware/errorMiddleware.js"; // Assuming you have a TryCatch utility
import { ErrorHandler } from "../utils/utils.js"; // Assuming you have an ErrorHandler
import { Chat } from "../models/Chat.model.js"; // Assuming you have a Chat model
import {
  deletFilesFromCloudinary,
  emitEvent,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import {
  ALERT,
  NEW_ATTACHMENTS,
  NEW_MESSAGES,
  NEW_MESSAGES_ALERT,
  REFETCH_CHATS,
} from "../constants/event.js";
import { getOtherMember } from "../lib/helper.js";
import { User } from "../models/User.model.js";
import { Message } from "../models/Message.model.js";

export const groupChat = TryCatch(async (req, res, next) => {
  const { chatName, members } = req.body;
  // Validate the input
  if (!chatName) {
    return next(new ErrorHandler("Chat name is required", 400));
  }
  if (!members || members.length < 2) {
    return next(new ErrorHandler("Please add at least 2 members", 400));
  }

  // Convert members to ObjectId
  const allMembers = [...members, req.user].map((member) =>
    mongoose.Types.ObjectId.createFromHexString(member)
  );

  const validMembers = members.every((member) =>
    mongoose.Types.ObjectId.isValid(member)
  );
  if (!validMembers) {
    return next(
      new ErrorHandler("All members must be valid ObjectId strings", 400)
    );
  }
  // Create the group chat
  const chat = await Chat.create({
    chatName: chatName,
    isGroupChat: true,
    creator: req.user,
    members: allMembers,
  });

  // Emit events
  emitEvent(req, ALERT, allMembers, `Welcome to ${chatName} GANG!`);
  emitEvent(req, REFETCH_CHATS, allMembers);

  return res.status(201).json({
    success: true,
    message: `${chatName} GANG! created successfully`,
    chat,
  });
});

export const getMyChats = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(
    ({ _id, chatName, members, isGroupChat }) => {
      const otherMember = getOtherMember(members, req.user);

      return {
        _id,
        isGroupChat,
        avatar: isGroupChat
          ? members.slice(0, 3).map(({ avatar }) => avatar.url)
          : [otherMember.avatar.url],
        name: isGroupChat ? chatName : otherMember.name,
        members: members.reduce((prev, curr) => {
          if (curr._id.toString() !== req.user.toString()) {
            prev.push(curr._id);
          }
          return prev;
        }, []),
      };
    }
  );

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

export const getMyGroup = TryCatch(async (req, res, next) => {
  const chats = await Chat.find({ members: req.user }).populate(
    "members",
    "name avatar"
  );

  const transformedChats = chats.map(
    ({ _id, chatName, members, isGroupChat }) => ({
      _id,
      isGroupChat,
      chatName,
      members,
      avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
    })
  );

  return res.status(200).json({
    success: true,
    chats: transformedChats,
  });
});

export const addMembers = TryCatch(async (req, res, next) => {
  const { chatId, members } = req.body;
  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.isGroupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only the creator can add members", 400));
  if (members.length < 1)
    return next(new ErrorHandler("Please add at least 1 member", 400));
  const allMembersPromise = members.map((i) => User.findById(i, "Chatname"));
  const allNewMembers = await Promise.all(allMembersPromise);
  const uniqueMembers = allNewMembers
    .filter((i) => !chat.members.includes(i._id.toString()))
    .map((i) => i._id);

  chat.members.push(...uniqueMembers);
  if (chat.members.length > 100)
    return next(new ErrorHandler("Cannot add more than 100 members", 400));
  await chat.save();

  const allMembersName = allNewMembers.map((i) => i.name).join(", ");

  emitEvent(
    req,
    ALERT,
    chat.members,
    `${allMembersName} joined the ${chat.chatName} GANG! Talk`
  );

  emitEvent(req, REFETCH_CHATS, chat.members);

  return res.status(200).json({
    success: true,
    message: "Members added successfully",
  });
});

export const removeMember = TryCatch(async (req, res, next) => {
  const { userId, chatId } = req.body;
  console.log("userId,chatId", userId, chatId);
  const [chat, UserToRemove] = await Promise.all([
    Chat.findById(chatId),
    User.findById(userId, "name"),
  ]);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.isGroupChat)
    return next(new ErrorHandler("This is not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(new ErrorHandler("Only the creator can remove members", 400));
  chat.members = chat.members.filter((i) => i.toString() !== UserToRemove);
  if (chat.members.length < 1)
    return next(new ErrorHandler("Cannot remove all members", 400));

  chat.members = chat.members.filter(
    (member) => member.toString() !== userId.toString()
  );

  await chat.save();
  emitEvent(
    req,
    ALERT,
    chat.members,
    `${UserToRemove.name} left the ${chat.chatName} GANG! Talk`
  );
  emitEvent(req, REFETCH_CHATS, allChatMembers);
});

export const leaveGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.isGroupChat)
    return next(new ErrorHandler("This is not a group chat", 400));

  const remainingMembers = chat.members.filter(
    (member) => member.toString() !== req.user.toString()
  );

  if (remainingMembers.length < 3)
    return next(new ErrorHandler("Group must have at least 3 members", 400));

  if (chat.creator.toString() === req.user.toString()) {
    const randomElement = Math.floor(Math.random() * remainingMembers.length);
    const newCreator = remainingMembers[randomElement];
    chat.creator = newCreator;
  }

  chat.members = remainingMembers;

  const [user] = await Promise.all([
    User.findById(req.user, "name"),
    chat.save(),
  ]);

  emitEvent(req, ALERT, chat.members, {
    chatId,
    message: `Homie ${user.name} has left the GANG!`,
  });

  return res.status(200).json({
    success: true,
    message: "Leave Group Successfully",
  });
});

export const sendAttachments = TryCatch(async (req, res, next) => {
  const { chatId } = req.body;

  const files = req.files || [];

  if (files.length < 1)
    return next(new ErrorHandler("Please Upload Attachments", 400));

  if (files.length > 5)
    return next(new ErrorHandler("Files Can't be more than 5", 400));

  const [chat, me] = await Promise.all([
    Chat.findById(chatId),
    User.findById(req.user, "name"),
  ]);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (files.length < 1)
    return next(new ErrorHandler("Please provide attachments", 400));

  //   Upload files here
  const attachments = await uploadFilesToCloudinary(files);

  const messageForDB = {
    content: "",
    attachments,
    sender: me._id,
    chat: chatId,
  };

  const messageForRealTime = {
    ...messageForDB,
    sender: {
      _id: me._id,
      name: me.name,
    },
  };

  const message = await Message.create(messageForDB);

  emitEvent(req, NEW_MESSAGES, chat.members, {
    message: messageForRealTime,
    chatId,
  });

  emitEvent(req, NEW_MESSAGES_ALERT, chat.members, { chatId });

  return res.status(200).json({
    success: true,
    message,
  });
});

export const getChatDetailes = TryCatch(async (req, res, next) => {
  if (req.query.populate === "true") {
    const chat = await Chat.findById(req.params.id)
      .populate("members", "name avatar")
      .lean();
    if (!chat) return next(new ErrorHandler("Chat not found", 404));

    chat.members = chat.members.map(({ _id, name, avatar }) => ({
      _id,
      name,
      avatar,
    }));
    return res.status(200).json({
      success: true,
      chat,
    });
  } else {
    const chat = await Chat.findById(req.params.id);
    if (!chat) return next(new ErrorHandler("Chat not found", 404));
    return res.status(200).json({
      success: true,
      chat,
    });
  }
});

export const renameGroup = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  console.log("chatId", chatId);
  const { name } = req.body;
  console.log("user", req.user);

  const chat = await Chat.findById(chatId);
  if (!chat) return next(new ErrorHandler("Chat not found", 404));
  if (!chat.isGroupChat) return next(new ErrorHandler("Not a group chat", 400));
  if (chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not allowed to rename the group", 403)
    );

  chat.chatName = name;

  await chat.save();

  res.status(200).json({
    success: true,
    message: "Group renamed successfully",
  });
});

export const deleteChat = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  const members = chat.members;

  if (chat.isGroupChat && chat.creator.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not allowed to delete the group", 403)
    );

  if (!chat.isGroupChat && !chat.members.includes(req.user.toString())) {
    return next(
      new ErrorHandler("You are not allowed to delete the chat", 403)
    );
  }

  const messagesWithAttachments = await Message.find({
    chat: chatId,
    attachments: { $exists: true, $ne: [] },
  });

  const public_ids = [];

  messagesWithAttachments.forEach(({ attachments }) =>
    attachments.forEach(({ public_id }) => public_ids.push(public_id))
  );

  await Promise.all([
    deletFilesFromCloudinary(public_ids),
    chat.deleteOne(),
    Message.deleteMany({ chat: chatId }),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Chat deleted successfully",
  });
});

export const getMessages = TryCatch(async (req, res, next) => {
  const chatId = req.params.id;
  const { page = 1 } = req.query;

  const resultPerPage = 20;
  const skip = (page - 1) * resultPerPage;

  const chat = await Chat.findById(chatId);

  if (!chat) return next(new ErrorHandler("Chat not found", 404));

  if (!chat.members.includes(req.user.toString()))
    return next(
      new ErrorHandler("You are not allowed to access this chat", 403)
    );

  const [messages, totalMessagesCount] = await Promise.all([
    Message.find({ chat: chatId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(resultPerPage)
      .populate("sender", "name")
      .lean(),
    Message.countDocuments({ chat: chatId }),
  ]);

  const totalPages = Math.ceil(totalMessagesCount / resultPerPage) || 0;

  return res.status(200).json({
    success: true,
    messages: messages.reverse(),
    totalPages,
  });
});
