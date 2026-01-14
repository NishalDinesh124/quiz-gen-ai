import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import flashcardRoutes from "./routes/flashCard.js";
import quizRoutes from "./routes/quiz.js";
import userActivityRoutes from "./routes/userActivity.js";
import attemptRoutes from "./routes/attempts.js";
import sessionRoutes from "./routes/sessions.js";
import notesRoutes from "./routes/notes.js";
import videoRoutes from "./routes/videos.js";
import flashcardSetRoutes from "./routes/flashcardSets.js";
import quizSetRoutes from "./routes/quizSets.js";
import flashcardAttemptRoutes from "./routes/flashcardAttempts.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

// --- Startup environment validation (fail fast) ---
const requiredEnv = [
  'MONGO_URL',
  'FRONT_END_URL',
]
const missing = requiredEnv.filter((k) => !process.env[k])
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`)
  process.exit(1)
}

const app = express();

// middleware
const allowedOrigin = process.env.FRONT_END_URL;
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || origin === allowedOrigin) {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
};
app.use(cors(corsOptions));
app.use(express.json({ limit: "2mb" }));

app.use((err, req, res, next) => {
  if (err?.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large. Max 2MB." });
  }
  return next(err);
});

// test route
app.get("/", (req, res) => {
  res.json({
    status: "OK",
    message: "Backend server is running",
  });
});

// === routes == ///
// app.use("/api/auth", authRoutes);
// app.use("/api/ai", aiRoutes);
app.use("/api/flashcards", flashcardRoutes);
app.use("/api/quizzes", quizRoutes);
app.use("/api/user-activity", userActivityRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/sessions", sessionRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/flashcard-sets", flashcardSetRoutes);
app.use("/api/quiz-sets", quizSetRoutes);
app.use("/api/flashcard-attempts", flashcardAttemptRoutes);

const PORT = process.env.PORT || 8080;
const uri = process.env.MONGO_URL;

// connect to DB and start server
const startDbAndServer = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(uri, {
      autoIndex: true,
    });
    console.log("DB Connection Successful");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error("DB Connection Failed!", err);
    process.exit(1);
  }
};

startDbAndServer();
