import mongoose from "mongoose";
import Conversation from "./conversation";
import User from "./users";
import Thread from "./thread";

const usageSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
        required: true,
    },
    threadId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Thread,
        required: true,
    },
    aiResponseId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: Conversation,
        required: true,
    },
    embeddingToken: { 
        type: Number, 
        required: true },
    titleGenerationToken: {
        prompt: { type: Number, required: true },
        output: { type: Number, required: true },
        total: { type: Number, required: true }
    },
    responseGenerationToken: {
        prompt: { type: Number, required: true },
        output: { type: Number, required: true },
        total: { type: Number, required: true }
    },
    totalUsage: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

const Usage = mongoose.models.Usage || mongoose.model("Usage", usageSchema);

export default Usage;
