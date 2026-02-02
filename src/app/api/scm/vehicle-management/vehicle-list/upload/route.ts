import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeExt(mime: string) {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "bin";
}

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    // ✅ size guard (5MB)
    if (typeof file.size === "number" && file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    // ✅ type guard
    const mime = String(file.type || "").toLowerCase();
    if (!ALLOWED_TYPES.has(mime)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPG, PNG, WEBP." },
        { status: 400 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());

    // Extra safety (in case file.size is missing)
    if (bytes.length > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 413 }
      );
    }

    // ✅ Save under /public/uploads/vehicles
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "vehicles");
    await fs.mkdir(uploadsDir, { recursive: true });

    const ext = safeExt(mime);
    const name = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}.${ext}`;

    const diskPath = path.join(uploadsDir, name);
    await fs.writeFile(diskPath, bytes);

    // ✅ Store this path in DB (vehicles.image)
    const publicPath = `/uploads/vehicles/${name}`;

    return NextResponse.json({ data: { path: publicPath } }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: String(e?.message || e) },
      { status: 500 }
    );
  }
}
