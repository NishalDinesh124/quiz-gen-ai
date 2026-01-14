import mongoose from "mongoose";

const flashcardSchema = new mongoose.Schema({
    userId: {
        type: String,
        ref: "User",
        required: true,
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "chat_sessions",
    },
    title: {
        type: String,
        required: true,
    },
    count: {
        type: Number,
        required: true,
    },
    difficulty: {
        type: String,
        required: true,
    },
    category: {
        type: String,
        required: true,
    },
    language: {
        type: String,
        required: true,
    },
    cards: [{
        front: {
            type: String,       
            required: true
        },
        back: {
            type: String,
            required: true
        },
        explanation: {
            type: String,
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    }
}, {
    timestamps: true
});


export default mongoose.model("flashCards", flashcardSchema);


// {
//   title,
//   difficulty,
//   language,
//   cards: [{ front, back }],
//   createdAt
// }
