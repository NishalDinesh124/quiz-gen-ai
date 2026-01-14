import express from "express";
import {
  generateYoutubeContext,
  getVideoContext,
} from "../controllers/videoController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.post("/youtube", generateYoutubeContext);
router.get("/:sessionId", getVideoContext);

export default router;
