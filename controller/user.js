import User from "@/models/users";
import { welcomeEmail } from "@/services/mail";
import { registerValidater } from "@/validations/validate";
import bcrypt from "bcryptjs"


export const RegisterUser = async (req, res) => {
    try {
        const { data, error } = registerValidater.safeParse(req.body)
        if (data) {

            const exist = await User.findOne({ email: req.body.email });

            if (exist) {
                return res.status(400).json({
                    message: "Email already exists"
                });
            }
            const hashedPassword = await bcrypt.hash(req.body.password, 10);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                password: hashedPassword,
            });
            await User.create(user);
            await welcomeEmail(user.email)
            return res.status(200).json({ message: "User created successfully" });

        }
        else if (error) {
            res.json({ message: error.message })
        }
        else {
            return res.status(400).json({ message: "All fields are required" });
        }
    } catch (err) {
        throw err
    }
}