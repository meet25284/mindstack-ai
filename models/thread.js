import {model, mongoose} from "mongoose";
import User from "./users";


const thread = new mongoose.Schema({
    title:{
        type:String,
        default: "New chat"
    },
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: User
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
})

const Thread = mongoose.models.Thread || model("Thread", thread)

export default Thread