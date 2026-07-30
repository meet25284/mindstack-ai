import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique:true
    },
    password: {
        type: String,
        required: true,
    },
    paymentId:{
        type: String,
    },
    amount:{
        type: Number,
    },
    isPremium:{
        type: Boolean,
        default: false
    },
    // Token-based billing
    tokens: {
        type: Number,
        default: 0,
        min: 0,
    },
    tokensLifetimePurchased: {
        type: Number,
        default: 0,
        min: 0,
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
    },
    isVerified:{
        type: Boolean,
        default: false
    }
});

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
