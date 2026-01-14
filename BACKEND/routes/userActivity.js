import express from "express";
import {
  getUserActivity,
  getUserSummary,
} from "../controllers/userActivityController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.get("/", requireAuth, getUserActivity);
router.get("/summary", requireAuth, getUserSummary);

export default router;
