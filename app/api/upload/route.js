import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import File from "@/models/files";
import { isAuthenticated } from "@/middleware/auth";
import PdfParse from "pdf-parse";
import mammoth from "mammoth";


export async function POST(request) {
    try {

        const user = await isAuthenticated(request)
        if (user.status !== (401 || 404)) {
            const formData = await request.formData();

            const file = formData.get("document");
            const title = formData.get("title");

            const allowedMimeTypes = [
                "application/pdf",
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/markdown",
            ];


            if (file == "null") {
                return NextResponse.json(
                    { message: "No file uploaded" },
                    { status: 400 }
                );
            }
            if (title == "null") {
                return NextResponse.json(
                    { message: "title required" },
                    { status: 400 }
                );
            }

            if (!allowedMimeTypes.includes(file.type)) {
                return NextResponse.json(
                    {
                        message: "Only PDF, DOCX, TXT and Markdown files are allowed.",
                    },
                    { status: 400 }
                );
            }

            // Convert File -> Buffer
            let bytes = await file.arrayBuffer();
            let buffer = Buffer.from(bytes);

            // Create uploads folder if it doesn't exist
            const uploadDir = path.join(process.cwd(), "assets/uploads");

            await fs.mkdir(uploadDir, { recursive: true });

            // Generate unique filename
            const fileName = `${Date.now()}-${file.name}`;

            const filePath = path.join(uploadDir, fileName);

            // Save file
            await fs.writeFile(filePath, buffer);

            //save into db
            await File.create({
                title: title,
                path: filePath
            });
            const chunkSize = 1000
            const overlap = 100

            switch (file.type) {
                case "application/pdf":
                    const pdftext = await PdfParse(buffer)
                    const pdfchunks = [];

                    for (let i = 0; i < pdftext.text.length; i += chunkSize - overlap) {
                        pdfchunks.push(pdftext.text.slice(i, i + chunkSize));
                    }
                    break;

                case "text/plain":
                    const text = await file.text()
                    const textchunks = [];

                    for (let i = 0; i < text.length; i += chunkSize - overlap) {
                        textchunks.push(text.slice(i, i + chunkSize));
                    }
                    break;

                case "text/markdown":
                    const mdtotext = await file.text()
                    const mdchunks = [];

                    for (let i = 0; i < mdtotext.length; i += chunkSize - overlap) {
                        mdchunks.push(mdtotext.slice(i, i + chunkSize));
                    }
                    break;

                case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                    const doctext = await mammoth.extractRawText({ buffer })
                    const docchunks = [];
                    
                    for (let i = 0; i < doctext.value.length; i += chunkSize - overlap) {
                        docchunks.push(doctext.value.slice(i, i + chunkSize));
                    }
                    break;

                default:
                    throw new Error("Unsupported file type");
            }
            return NextResponse.json({
                success: true,
                fileName,
                path: filePath,
            });
        }
        else {
            return NextResponse.json({
                message: "Unauthorized"
            }, { status: 401 })
        }

    } catch (error) {
        console.error(error);

        return NextResponse.json(
            { message: "Upload failed" },
            { status: 500 }
        );
    }
}