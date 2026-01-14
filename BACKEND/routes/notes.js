import express from "express";
import {
  generateNotes,
  getNoteById,
  getNotes,
} from "../controllers/noteController.js";
import requireAuth from "../middleware/requireAuth.js";

const router = express.Router();

router.use(requireAuth);

router.get("/", getNotes);
router.get("/:id", getNoteById);
router.post("/generate", generateNotes);

export default router;
