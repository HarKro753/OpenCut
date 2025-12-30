import { NextRequest, NextResponse } from "next/server";
import { db, media, eq } from "@opencut/db";

// GET /api/media?projectId={id} - List all media for a project
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId query parameter is required" },
        { status: 400 }
      );
    }

    const projectMedia = await db
      .select()
      .from(media)
      .where(eq(media.projectId, projectId));

    // Transform to client format
    const formattedMedia = projectMedia.map((item) => ({
      id: item.id,
      name: item.name,
      type: item.type,
      url: item.url,
      size: item.size,
      lastModified: item.lastModified,
      width: item.width,
      height: item.height,
      duration: item.duration,
      ephemeral: item.ephemeral,
      sourceStickerIconName: item.sourceStickerIconName,
    }));

    return NextResponse.json({
      success: true,
      media: formattedMedia,
    });
  } catch (error) {
    console.error("List media error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/media - Create media metadata
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const {
      id,
      projectId,
      name,
      type,
      url,
      size,
      lastModified,
      width,
      height,
      duration,
      ephemeral,
      sourceStickerIconName,
    } = body;

    if (!id || !projectId || !name || !type || !url || size === undefined || !lastModified) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: id, projectId, name, type, url, size, lastModified",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    await db.insert(media).values({
      id,
      projectId,
      name,
      type,
      url,
      size,
      lastModified,
      width: width || null,
      height: height || null,
      duration: duration || null,
      ephemeral: ephemeral || false,
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
        size,
        lastModified,
        width,
        height,
        duration,
        ephemeral,
        sourceStickerIconName,
      },
    });
  } catch (error) {
    console.error("Create media error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
