import mongoose from "mongoose";
import User from "./users";
const FileSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    path: {
        type: String,
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
    isDeleted:{
        type: Boolean,
        default: false
    }
});

const File = mongoose.models.File || mongoose.model("File", FileSchema);
export default File;
