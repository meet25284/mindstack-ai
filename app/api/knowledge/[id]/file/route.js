import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { isAuthenticated } from "@/middleware/auth";

export async function GET(request, { params }) {
  try {
    const user = await isAuthenticated(request);
    if (!user || user.status === 401 || user.status === 404) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
    }

    await connectDB();
    const doc = await File.findById(id);
    if (!doc || !doc.path) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    let absolutePath = doc.path;
    if (!path.isAbsolute(absolutePath)) {
      absolutePath = path.join(process.cwd(), doc.path);
    }

    const fileBuffer = await fs.readFile(absolutePath);
    const basename = path.basename(absolutePath);
    const ext = path.extname(absolutePath).toLowerCase();

    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".txt") contentType = "text/plain; charset=utf-8";
    else if (ext === ".md") contentType = "text/markdown; charset=utf-8";
    else if (ext === ".docx")
      contentType =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(basename)}"`,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GET /api/knowledge/[id]/file Error:", error);
    return NextResponse.json(
      { message: "File not available on server" },
      { status: 404 }
    );
  }
}
