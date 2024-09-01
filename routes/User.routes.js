import express from "express";
import {
  acceptFriendRequest,
  getAllNotifications,
  getMyFriends,
  getMyProfile,
  loginUser,
  logOutUser,
  newUser,
  searchUser,
  sendRequest,
} from "../controllers/User.controller.js";
import {
  acceptRequestValidator,
  loginValidator,
  registerValidator,
  sendRequestValidator,
  validateHandler,
} from "../lib/valid.js";
import { isAuth } from "../middleware/isAuth.js";
import { singleUpload } from "../middleware/multer.js";
const router = express.Router();

router.post("/login", loginValidator(), validateHandler, loginUser);
router.post(
  "/new",
  singleUpload,
  registerValidator(),
  validateHandler,
  newUser
);
router.get("/logout", logOutUser);

router.get("/me", isAuth, getMyProfile);
router.get("/search", isAuth, searchUser);
router.put(
  "/send/request",
  isAuth,
  sendRequestValidator(),
  validateHandler,
  sendRequest
);
router.put(
  "/accept/request",
  isAuth,
  acceptRequestValidator(),
  validateHandler,
  acceptFriendRequest
);

router.get("/notifications", isAuth, getAllNotifications);

router.get("/homies", isAuth, getMyFriends);

export default router;
