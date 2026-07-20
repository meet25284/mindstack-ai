import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import File from "@/models/files";
import { isAuthenticated } from "@/middleware/auth";
import { textconverter } from "@/services/textconverter";
import { generateBatchEmbeddings } from "@/services/generateEmbedding";
import { db } from "@/lib/mongodb";


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
            const colFile = await File.create({
                title: title,
                path: filePath
            });

            const chunks = await textconverter(file, buffer);
            const embeddings = await generateBatchEmbeddings(chunks);
            const docs = chunks.map((chunk, index) => ({
                knowledgeId: colFile._id,
                chunkIndex: index,
                content: chunk,
                vector: embeddings[index],
            }));

            await db.collection("vector").insertMany(docs);


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