import {model, mongoose,  Schema } from "mongoose";
import Thread from "./thread";
import User from "./users";


const conversation = new mongoose.Schema({
    ThreadId: {
        type: String,
        required: true,
        ref: Thread
    },

    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: User,
    },
    sender:{
        type:String,
        enum:["ai","user"] 

    },
    message:{
        type:String
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

const Conversation = mongoose.models.Conversation || new model("Conversation", conversation)

export default Conversation