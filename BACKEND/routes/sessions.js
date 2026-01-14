import express from "express";
import requireAuth from "../middleware/requireAuth.js";
import {
  createSession,
  getSessionById,
  getSessions,
  sendChatMessage,
  addSessionContext,
  updateSessionTitle,
  deleteSession,
} from "../controllers/chatSessionController.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getSessions);
router.post("/", createSession);
router.get("/:id", getSessionById);
router.post("/:id/messages", sendChatMessage);
router.post("/:id/context", addSessionContext);
router.patch("/:id", updateSessionTitle);
router.delete("/:id", deleteSession);

export default router;
