import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();
import { getVerificationEmailTemplate } from "@/templetes/verification_email_templete";
import { getWelcomeEmailTemplate } from "@/templetes/welcome_email_templete";
import { getOTPEmailTemplate } from "@/templetes/otp_email_templete";
import User from "@/models/users";
import { createToken } from "./jwt";

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

export const welcomeEmail = (email, name) => {
    return sendEmail(
        email,
        "Welcome to MindStack AI",
        getWelcomeEmailTemplate(name)
    );
};
const otpStore = new Map();

export const sendOTP = async (email) => {

    const otp = Math.floor(
        100000 + Math.random() * 900000
    ).toString();

    otpStore.set(email, otp);

    await sendEmail(
        email,
        "Email Verification Code",
        getOTPEmailTemplate(otp)
    );

    return true;
};

export const verifyOTP = (email, otp) => {
    const storedOTP = otpStore.get(email);

    return storedOTP === otp;
};

export const verifyEmail = async (email) => {
    const user = await User.findOne({email: email});
    const verificationToken = createToken(user._id)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const verificationLink = `${baseUrl}/api/verify-email/${verificationToken}`;
    
    await sendEmail(
        user.email,
        "Verify Your Email",
        getVerificationEmailTemplate(verificationLink)
    );
};

    