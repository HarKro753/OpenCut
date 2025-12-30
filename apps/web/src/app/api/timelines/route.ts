import { NextRequest, NextResponse } from "next/server";
import { db, timelines, eq } from "@opencut/db";

// GET /api/timelines?sceneId={id} - Get timeline for a scene
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sceneId = searchParams.get("sceneId");

    if (!sceneId) {
      return NextResponse.json(
        { error: "sceneId query parameter is required" },
        { status: 400 }
      );
    }

    const [timeline] = await db
      .select()
      .from(timelines)
      .where(eq(timelines.sceneId, sceneId))
      .limit(1);

    if (!timeline) {
      return NextResponse.json(
        { error: "Timeline not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tracks: timeline.tracks,
      updatedAt: timeline.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Get timeline error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/timelines/:sceneId - Upsert timeline for a scene
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { sceneId, tracks } = body;

    if (!sceneId || !tracks) {
      return NextResponse.json(
        { error: "Missing required fields: sceneId, tracks" },
        { status: 400 }
      );
    }

    // Check if timeline exists
    const [existingTimeline] = await db
      .select()
      .from(timelines)
      .where(eq(timelines.sceneId, sceneId))
      .limit(1);

    const now = new Date();

    if (existingTimeline) {
      // Update existing timeline
      await db
        .update(timelines)
        .set({
          tracks,
          updatedAt: now,
        })
        .where(eq(timelines.sceneId, sceneId));
    } else {
      // Create new timeline
      // Generate a unique ID for the timeline
      const timelineId = `timeline-${sceneId}`;

      await db.insert(timelines).values({
        id: timelineId,
        sceneId,
        tracks,
        updatedAt: now,
      });
    }

    return NextResponse.json({
      success: true,
      tracks,
      updatedAt: now.toISOString(),
    });
  } catch (error) {
    console.error("Upsert timeline error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
