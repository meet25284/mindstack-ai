import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

export const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "2m" });
};

export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded?.id || decoded?.email || null ;
    } catch (err) {
        // invalid/expired/malformed token — treat as "not verified"
        console.error("verifyToken error:", err.message);
        return null;
    }
};