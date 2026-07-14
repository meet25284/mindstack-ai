import User from "@/models/users";
import { verifyToken } from "@/services/jwt";


export const getMe = async (token) => {
    if (!token) return null;
    const cleanToken = token.startsWith("Bearer ") ? token.slice(7) : token;
    const id = verifyToken(cleanToken);
    if (!id) return null;
    const user = await User.findById(id);
    return user;
};





export const isAuthenticated = async (req, res, next) => {
    try {
        const token = req.header("Authorization")
        const user = await getMe(token)
        if (user?._id) {
            req.me = user;
            next();
        } else {
            throw new Error("Not authenticated")
        }
    } catch (err) {
        res.status(500).json({ message: err?.message });
    }

}