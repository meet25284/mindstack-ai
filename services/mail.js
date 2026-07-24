import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import jwt from "jsonwebtoken";

export const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: process.env.email,
        pass: process.env.password
    }
}); 

export const sendEmail = async (
    to,
    subject,
    html
) => {
    if (process.env.NODE_ENV === "test") {
        return;
    }
    await transporter.sendMail({
        from: process.env.gmail,
        to,
        subject,
        html,
    });
};

export const welcomeEmail = (email) => {
    return sendEmail(email, "welcome to library")
}
const otpStore = new Map();

export const sendOTP = async (email) => {

    const otp = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    otpStore.set(email, otp);

    await sendEmail(
        email,
        "Email Verification",
        `<h2>Your OTP is ${otp}</h2>`
    );

    return true;
};

export const verifyOTP = (email, otp) => {
    const storedOTP = otpStore.get(email);

    return storedOTP === otp;
};

export const verifyEmail = async (email) => {
    const verificationToken = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    await sendEmail(
        email,
        "Verify Your Email",
        `<button style="padding: 10px 20px; background-color: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;"><a href="http://localhost:3000/api/verify-email/${verificationToken}" style="text-decoration: none; color: white;">Verify Email</a></button>`
    );
}
    