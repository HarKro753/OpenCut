import { NextRequest, NextResponse } from "next/server";
import { db, media } from "@opencut/db";

// POST /api/media/batch - Batch create media metadata (for migration)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { projectId, mediaItems } = body;

    if (!projectId || !Array.isArray(mediaItems)) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, mediaItems (array)" },
        { status: 400 }
      );
    }

    const now = new Date();
    const values = mediaItems.map((item: any) => ({
      id: item.id,
      projectId,
      name: item.name,
      type: item.type,
      url: item.url, // R2 URL required for batch inserts
      size: item.size,
      lastModified: item.lastModified,
      width: item.width || null,
      height: item.height || null,
      duration: item.duration || null,
      ephemeral: item.ephemeral || false,
      sourceStickerIconName: item.sourceStickerIconName || null,
      createdAt: now,
    }));

    if (values.length > 0) {
      await db.insert(media).values(values);
    }

    return NextResponse.json({
      success: true,
      count: values.length,
    });
  } catch (error) {
    console.error("Batch create media error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
