import { v2 as cloudinary } from "cloudinary";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { v4 as uuid } from "uuid";
import { connectDB } from "./utils/Db.js";

// routes imports
import { NEW_MESSAGES, NEW_MESSAGES_ALERT } from "./constants/event.js";
import { getSockets } from "./lib/helper.js";
import { socketAuthenticator } from "./middleware/isAuth.js";
import { Message } from "./models/Message.model.js";
import UserRoutes from "./routes/User.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import ChatRoutes from "./routes/chat.routes.js";
import dotenv from "dotenv";
import { log } from "console";
dotenv.config();
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Initialize express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.set("io", io);

// Middleware
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(cookieParser());

// Socket middleware
io.use((socket, next) => {
  cookieParser()(socket.request, socket.request.res || {}, (err) => {
    if (err) return next(err);
    console.log("Cookies received:", socket.request.cookies); // Log cookies to debug
    socketAuthenticator(socket, next);
  });
});

export const adminSecretKey =
  process.env.ADMIN_SECRET_KEY || "admin-secret-key";

const port = process.env.PORT || 5000;

// Routes
app.use("/api/v1/user", UserRoutes);
app.use("/api/v1/chat", ChatRoutes);
app.use("/api/v1/admin", adminRoutes);

// socket.io
const userSocketIDs = new Map();

io.on("connection", (socket) => {
  const tempUser = socket.user;
  console.log("tempUser", tempUser);

  userSocketIDs.set(tempUser._id, socket.id);
  console.log("userSocketIDs", userSocketIDs);
  console.log("a user connected", socket.id);

  socket.on(NEW_MESSAGES, async ({ chatId, member, message }) => {
    const MessageForRealTime = {
      content: message,
      _id: uuid(),
      sender: {
        _id: tempUser._id,
        name: tempUser.name,
      },
      chat: chatId,
      createdAt: new Date().toISOString(),
    };

    const messageForDb = {
      content: message,
      sender: tempUser._id,
      chat: chatId,
    };
    await Message.create(messageForDb);
    console.log("emmiting", MessageForRealTime);

    const userSocket = getSockets(member);
    io.to(userSocket).emit(NEW_MESSAGES, {
      chatId,
      message: MessageForRealTime,
    });
    io.to(userSocket).emit(NEW_MESSAGES_ALERT, {
      chatId,
    });
  });

  socket.on("disconnect", () => {
    console.log("user disconnected", socket.id);
    userSocketIDs.delete(tempUser._id.toString());
  });
});

// Connect to the database
connectDB(process.env.URL);

// Start the server
server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

export { io, userSocketIDs };
