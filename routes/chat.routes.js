import express from "express";
import {
  addMembers,
  deleteChat,
  getChatDetailes,
  getMessages,
  getMyChats,
  getMyGroup,
  groupChat,
  leaveGroup,
  removeMember,
  renameGroup,
  sendAttachments,
} from "../controllers/chat.controller.js";
import { isAuth } from "../middleware/isAuth.js";
import { attachmentsMulter } from "../middleware/multer.js";
import {
  addMemberValidator,
  chatIdValidator,
  newGroupValidator,
  removeMemberValidator,
  renameValidator,
  sendAttachmentsValidator,
  validateHandler,
} from "../lib/valid.js";
const router = express.Router();

// post req
router.post("/new", isAuth, newGroupValidator(), validateHandler, groupChat);
router.post(
  "/attachments",
  isAuth,
  attachmentsMulter,
  sendAttachmentsValidator(),
  validateHandler,
  sendAttachments
);

// put
router.put(
  "/addmembers",
  isAuth,
  addMemberValidator(),
  validateHandler,
  addMembers
);
router.put(
  "/removeMember",
  isAuth,
  removeMemberValidator(),
  validateHandler,
  removeMember
);
//
// delete
router.delete(
  "/leave/group/:id",
  isAuth,
  chatIdValidator(),
  validateHandler,
  leaveGroup
);

// get
router.get("/my", isAuth, getMyChats);
router.get("/myGroup", isAuth, getMyGroup);
router.use(isAuth);
router
  .route("/:id")
  .get(chatIdValidator(), validateHandler, getChatDetailes)
  .put(renameValidator(), validateHandler, renameGroup)
  .delete(chatIdValidator(), validateHandler, deleteChat);
router.get("/message/:id", chatIdValidator(), validateHandler, getMessages);

export default router;
