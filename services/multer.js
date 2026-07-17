import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads folder if it doesn't exist
if (!fs.existsSync("../assets/uploads")) {
    fs.mkdirSync("../assets/uploads");
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "../assets/uploads/");
    },

    filename: (req, file, cb) => {
        const uniqueName =
            Date.now() + "-" + Math.round(Math.random() * 1e9);

        cb(
            null,
            uniqueName + path.extname(file.originalname)
        );
    },
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        "application/pdf",
        "text/plain",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/markdown",
    ];

    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file type"), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024, // 25 MB
    },
});

export default upload;