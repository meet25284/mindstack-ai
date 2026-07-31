/**
 * app/api/knowledge/[id]/file/route.js
 *
 * Authenticated file-serving proxy.
 *
 * ROOT CAUSE OF 401 (Cloudinary):
 *   Previous code had two bugs:
 *
 *   BUG 1 — Double folder (uploadService):
 *     `folder: "mindstack"` + `public_id: "mindstack/file"` → Cloudinary stores
 *     at "mindstack/mindstack/file". The resulting secure_url contains the double
 *     prefix, which is technically a valid path but confusing.
 *     FIXED in uploadService: removed `folder`, publicId is now the sole authority.
 *
 *   BUG 2 — Signed URL 401:
 *     `cloudinary.url(id, { sign_url: true, expires_at: ... })` generates a
 *     timed-signature URL that requires "Strict Transformations" enabled in the
 *     Cloudinary account (a paid feature). Without it, even validly-signed URLs
 *     with expires_at return 401.
 *     FIXED: use resource_type:"raw" for new uploads so secure_url is always
 *     publicly accessible (raw resources bypass image transformation restrictions).
 *     For legacy "image" type docs, generate a simpler signed URL (no expires_at).
 *
 * FETCH STRATEGY:
 *   For each document we try multiple approaches in order until one succeeds.
 *   This gracefully handles both new (raw type) and legacy (image type) documents.
 *
 *   1. Fetch stored secure_url directly        ← works for new "raw" uploads
 *   2. Fetch with duplicated folder stripped    ← fixes old double-mindstack docs
 *   3. Signed URL (no expires_at)              ← for private/restricted resources
 *   4. Signed URL with dedup'd publicId        ← for restricted + old docs
 */

import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import File from "@/models/files";
import connectDB from "@/services/mongoConnect";
import { isAuthenticated } from "@/middleware/auth";
import cloudinary from "@/lib/cloudinary";

// ─── MIME helpers ──────────────────────────────────────────────────────────────

const MIME_BY_EXT = {
  ".pdf":  "application/pdf",
  ".txt":  "text/plain; charset=utf-8",
  ".md":   "text/markdown; charset=utf-8",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function resolveMime(storedMime, filePath) {
  if (storedMime) return storedMime;
  const ext = path.extname(filePath || "").toLowerCase();
  return MIME_BY_EXT[ext] || "application/octet-stream";
}

function resolveFileName(doc) {
  if (doc.originalFileName) return doc.originalFileName;
  if (doc.path) return path.basename(doc.path);
  return doc.title || "file";
}

/**
 * Parse the Cloudinary resource type from the stored secure_url.
 * New uploads use "raw"; legacy uploads may be under "image".
 */
function parseResourceType(url) {
  if (!url) return "raw";
  if (url.includes("/raw/")) return "raw";
  if (url.includes("/video/")) return "video";
  return "image"; // legacy PDFs uploaded with resource_type:"auto"
}

/**
 * Fix the double-folder path that was created by the old uploadService bug.
 * "mindstack/mindstack/file" → "mindstack/file"
 * Returns the original string if no deduplication is needed.
 */
function deduplicatePath(str) {
  return str ? str.replace(/^(mindstack)\/\1\//, "$1/") : str;
}

/**
 * Try to fetch a URL and return the Response, or null if it fails / is not 2xx.
 */
async function tryFetch(url, label) {
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (res.ok) return res;
    console.warn(`[file/proxy] ${label} → ${res.status}`);
    return null;
  } catch (err) {
    console.warn(`[file/proxy] ${label} fetch error:`, err.message);
    return null;
  }
}

/**
 * Build a signed Cloudinary delivery URL (no expiry — simpler signature).
 * This bypasses access restrictions without requiring the "Strict Transformations"
 * Cloudinary feature (which requires a paid plan and console configuration).
 */
function buildSignedUrl(publicId, resourceType) {
  try {
    return cloudinary.url(publicId, {
      resource_type: resourceType,
      type: "upload",
      sign_url: true,
      secure: true,
      // NO expires_at — timed signatures require "Strict Transformations" to
      // be enabled in the Cloudinary console, which is a paid plan feature.
    });
  } catch (err) {
    console.warn("[file/proxy] cloudinary.url() threw:", err.message);
    return null;
  }
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request, { params }) {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  // Reads ?token= query param so <iframe src="/api/.../file?token=..."> works
  let user;
  try {
    user = await isAuthenticated(request);
  } catch (_) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }
  if (!user || typeof user.status === "number") {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  // ── Params ───────────────────────────────────────────────────────────────────
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ message: "Missing document ID" }, { status: 400 });
  }

  // ── Load document ─────────────────────────────────────────────────────────────
  await connectDB();
  const doc = await File.findById(id);

  if (!doc) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  if (doc.userId.toString() !== user._id.toString()) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  const mime     = resolveMime(doc.mimeType, doc.path);
  const fileName = resolveFileName(doc);

  const baseHeaders = {
    "Content-Type":           mime,
    "Content-Disposition":    `inline; filename="${encodeURIComponent(fileName)}"`,
    "Cache-Control":          "private, max-age=3600",
    "Accept-Ranges":          "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH A — Cloudinary document
  // Try multiple fetch strategies in order of reliability.
  // ═══════════════════════════════════════════════════════════════════════════
  if (doc.cloudinaryUrl || doc.publicId) {
    const resourceType = parseResourceType(doc.cloudinaryUrl);

    // Derive the "clean" publicId (fixes old double-folder documents)
    const rawPublicId   = doc.publicId || "";
    const cleanPublicId = deduplicatePath(rawPublicId);

    // Derive the "clean" secure_url (fixes double-folder in stored URL)
    const rawUrl   = doc.cloudinaryUrl || "";
    const cleanUrl = rawUrl.includes("/mindstack/mindstack/")
      ? rawUrl.replace("/mindstack/mindstack/", "/mindstack/")
      : rawUrl;

    console.log(`[file/proxy] Fetching doc ${id}`, {
      resourceType,
      rawPublicId,
      cleanPublicId: cleanPublicId !== rawPublicId ? cleanPublicId : "(same)",
    });

    // Strategy 1: Direct fetch of stored secure_url (works for "raw" type)
    let upstreamRes = await tryFetch(rawUrl, "direct secure_url");

    // Strategy 2: De-duplicated secure_url (fixes old double-mindstack path)
    if (!upstreamRes && cleanUrl !== rawUrl) {
      upstreamRes = await tryFetch(cleanUrl, "dedup secure_url");
    }

    // Strategy 3: Signed URL with stored publicId
    if (!upstreamRes) {
      upstreamRes = await tryFetch(
        buildSignedUrl(rawPublicId, resourceType),
        "signed URL (raw publicId)"
      );
    }

    // Strategy 4: Signed URL with dedup'd publicId
    if (!upstreamRes && cleanPublicId !== rawPublicId) {
      upstreamRes = await tryFetch(
        buildSignedUrl(cleanPublicId, resourceType),
        "signed URL (clean publicId)"
      );
    }

    if (!upstreamRes) {
      console.error(`[file/proxy] All Cloudinary fetch strategies failed for doc ${id}`);
      return NextResponse.json(
        {
          message:
            "Could not retrieve file from cloud storage after multiple attempts. " +
            "Please re-upload the document.",
        },
        { status: 502 }
      );
    }

    // Buffer the response — safer than streaming through NextResponse
    let fileBytes;
    try {
      fileBytes = await upstreamRes.arrayBuffer();
    } catch (err) {
      console.error("[file/proxy] Failed to buffer Cloudinary response:", err);
      return NextResponse.json({ message: "Failed to read file from cloud storage." }, { status: 502 });
    }

    return new NextResponse(fileBytes, {
      status: 200,
      headers: {
        ...baseHeaders,
        "Content-Length": fileBytes.byteLength.toString(),
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PATH B — Legacy local-disk document
  // ═══════════════════════════════════════════════════════════════════════════
  if (!doc.path) {
    return NextResponse.json(
      { message: "File not available — no local path and no cloud URL." },
      { status: 404 }
    );
  }

  let absolutePath = doc.path;
  if (!path.isAbsolute(absolutePath)) {
    absolutePath = path.join(process.cwd(), doc.path);
  }

  let fileBuffer;
  try {
    fileBuffer = await fs.readFile(absolutePath);
  } catch (err) {
    console.error(`[file/proxy] Cannot read local file ${absolutePath}:`, err);
    return NextResponse.json({ message: "File not available on server." }, { status: 404 });
  }

  return new NextResponse(fileBuffer, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": fileBuffer.byteLength.toString() },
  });
}
