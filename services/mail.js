import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();  

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