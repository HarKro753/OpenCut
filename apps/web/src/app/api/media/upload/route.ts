import { NextRequest, NextResponse } from "next/server";
import { db, media } from "@opencut/db";
import { uploadToR2, generateMediaKey, getContentType } from "@/lib/r2/upload";

// POST /api/media/upload - Upload media file to R2 and save metadata
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file") as File;
    const id = formData.get("id") as string;
    const projectId = formData.get("projectId") as string;
    const name = formData.get("name") as string;
    const type = formData.get("type") as "image" | "video" | "audio";
    const width = formData.get("width") as string | null;
    const height = formData.get("height") as string | null;
    const duration = formData.get("duration") as string | null;
    const ephemeral = formData.get("ephemeral") as string | null;
    const sourceStickerIconName = formData.get("sourceStickerIconName") as string | null;

    if (!file || !id || !projectId || !name || !type) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: file, id, projectId, name, type",
        },
        { status: 400 }
      );
    }

    // Convert File to Buffer for R2 upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Generate R2 key and upload
    const key = generateMediaKey(projectId, id, file.name);
    const contentType = getContentType(file.name);
    const url = await uploadToR2(buffer, key, contentType);

    // Save metadata to database
    const now = new Date();
    await db.insert(media).values({
      id,
      projectId,
      name,
      type,
      url,
      size: file.size,
      lastModified: file.lastModified,
      width: width ? Number.parseInt(width) : null,
      height: height ? Number.parseInt(height) : null,
      duration: duration ? Number.parseFloat(duration) : null,
      ephemeral: ephemeral === "true",
      sourceStickerIconName: sourceStickerIconName || null,
      createdAt: now,
    });

    return NextResponse.json({
      success: true,
      media: {
        id,
        name,
        type,
        url,
        size: file.size,
        lastModified: file.lastModified,
        width: width ? Number.parseInt(width) : null,
        height: height ? Number.parseInt(height) : null,
        duration: duration ? Number.parseFloat(duration) : null,
        ephemeral: ephemeral === "true",
        sourceStickerIconName,
      },
    });
  } catch (error) {
    console.error("Upload media error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
