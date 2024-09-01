import { compare } from "bcrypt";
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/event.js";
import { TryCatch } from "../middleware/errorMiddleware.js";
import { Chat } from "../models/Chat.model.js";
import { Request } from "../models/Request.model.js";
import { User } from "../models/User.model.js";
import {
  cookieOptions,
  emitEvent,
  sendToken,
  uploadFilesToCloudinary,
} from "../utils/features.js";
import { ErrorHandler } from "../utils/utils.js";
// Login user function (to be implemented)
export const loginUser = TryCatch(async (req, res, next) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username }).select("+password");

  if (!user) return next(new ErrorHandler("Invalid Username or Password", 404));

  const isMatch = compare(password, user.password);

  if (!isMatch)
    return next(new ErrorHandler("Invalid Username or Password", 404));

  sendToken(res, user, 200, `Welcome Back, ${user.name}`);
});

// Create new user function
export const newUser = async (req, res) => {
  const { name, username, password, bio } = req.body;
  const file = req.file;
  if (!file)
    return res.status(400).json({ message: "Please upload a Avartar" });

  const result = await uploadFilesToCloudinary([file]);

  const avatar = {
    public_id: result[0].public_id,
    url: result[0].url,
  };

  const user = await User.create({
    name,
    bio,
    username,
    password,
    avatar,
  });

  sendToken(res, user, 201, "User created");
};
export const getMyProfile = async (req, res) => {
  const user = await User.findById(req.user);

  res.status(200).json({
    success: true,
    user,
  });
};

export const logOutUser = TryCatch(async (req, res, next) => {
  return res
    .status(200)
    .cookie("Homies-token", "", { ...cookieOptions, maxAge: 0 })
    .json({
      success: true,
      message: "Logged out successfully",
    });
});

export const searchUser = TryCatch(async (req, res, next) => {
  const { name } = req.query;

  const myChats = await Chat.find({ isGroupChat: false, members: req.user });

  const allUserFromMyChat = myChats.map((chat) => chat.members).flat();

  const allUserExceptMe = await User.find({
    _id: { $nin: [req.user] },
    name: { $regex: name, $options: "i" },
  });

  const user = allUserExceptMe.map(({ _id, name, username, avatar }) => ({
    _id,
    name,
    username,
    avatar,
  }));

  res.status(201).json({
    success: true,
    user,
  });
});

export const sendRequest = TryCatch(async (req, res, next) => {
  const { userId } = req.body;
  const request = await Request.findOne({
    $or: [
      { sender: req.user, receiver: userId },
      { sender: userId, receiver: req.user },
    ],
  });
  if (request) return next(new ErrorHandler("Request already sent", 400));

  const newRequest = await Request.create({
    sender: req.user,
    receiver: userId,
  });
  emitEvent(req, NEW_REQUEST, [userId]);

  res.status(200).json({
    success: true,
    message: "Friend request sent successfully",
  });
});

export const acceptFriendRequest = TryCatch(async (req, res, next) => {
  const { requestId, accept } = req.body;

  const request = await Request.findById(requestId)
    .populate("sender", "name")
    .populate("receiver", "name");

  if (!request) return next(new ErrorHandler("Request not found", 404));

  if (request.receiver._id.toString() !== req.user.toString())
    return next(
      new ErrorHandler("You are not authorized to accept this request", 401)
    );

  if (!accept) {
    await request.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Friend Request Rejected",
    });
  }

  const members = [request.sender._id, request.receiver._id];

  await Promise.all([
    Chat.create({
      members,
      chatName: `${request.sender.name}-${request.receiver.name}`,
    }),
    request.deleteOne(),
  ]);

  emitEvent(req, REFETCH_CHATS, members);

  return res.status(200).json({
    success: true,
    message: "Friend Request Accepted",
    senderId: request.sender._id,
  });
});

export const getAllNotifications = TryCatch(async (req, res, next) => {
  const requests = await Request.find({ receiver: req.user }).populate(
    "sender",
    "name avatar"
  );

  const allrequest = requests.map(({ _id, sender }) => ({
    _id,
    sender: {
      _id: sender._id,
      name: sender.name,
      avatar: sender.avatar.url,
    },
  }));

  res.status(200).json({
    success: true,
    allrequest,
  });
});

export const getMyFriends = TryCatch(async (req, res) => {
  const chatId = req.query.chatId;

  const chats = await Chat.find({
    members: req.user,
    groupChat: false,
  }).populate("members", "name avatar");

  const friends = chats.map(({ members }) => {
    const otherUser = getOtherMember(members, req.user);

    return {
      _id: otherUser._id,
      name: otherUser.name,
      avatar: otherUser.avatar.url,
    };
  });

  if (chatId) {
    const chat = await Chat.findById(chatId);

    const availableFriends = friends.filter(
      (friend) => !chat.members.includes(friend._id)
    );

    return res.status(200).json({
      success: true,
      friends: availableFriends,
    });
  } else {
    return res.status(200).json({
      success: true,
      friends,
    });
  }
});
