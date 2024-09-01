import express from "express";
import {
  adminLogin,
  adminLogout,
  allMessages,
  dashboardStats,
  getAllChat,
  getAllUser,
} from "../controllers/admin.controller.js";
import { adminLoginValidator, validateHandler } from "../lib/valid.js";
import { adminOnly } from "../middleware/isAuth.js";
const router = express.Router();

router.post(
  "/verify/admin",
  adminLoginValidator(),
  validateHandler,
  adminLogin
);
router.post("/logout", adminLogout);

router.use(adminOnly);
router.get("/", getAllUser);
router.get("/chats", getAllChat);
router.get("/messages", allMessages);
router.get("/dashborad", dashboardStats);

export default router;
