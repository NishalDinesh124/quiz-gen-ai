import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true, 
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password:{
        type: String,
        required: true,
    },
    plan: {
        type: String,   
        required: true,
        default: "free"
    },
    flashcardCount: {
        type: Number,
        required: true, 
        default: 0
    },
    quizCount: {
        type: Number,
        required: true,
        default: 0  
    },
    remainingQuizzes: {
        type: Number,   
        required: true,
        default: 5
    },
    createdAt: {
        type: Date,
        default: Date.now,
        required: true
    },
}, {
    timestamps: true
});


module.exports = mongoose.model("Users", userSchema);