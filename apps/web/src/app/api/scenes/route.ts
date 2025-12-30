import { NextRequest, NextResponse } from "next/server";
import { db, scenes, eq } from "@opencut/db";

// GET /api/scenes?projectId={id} - List all scenes for a project
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

    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, projectId))
      .orderBy(scenes.orderIndex);

    // Transform to client format
    const formattedScenes = projectScenes.map((scene) => ({
      id: scene.id,
      name: scene.name,
      isMain: scene.isMain,
      createdAt: scene.createdAt.toISOString(),
      updatedAt: scene.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      success: true,
      scenes: formattedScenes,
    });
  } catch (error) {
    console.error("List scenes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/scenes - Create a new scene
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    const { id, projectId, name, isMain, orderIndex } = body;

    if (!id || !projectId || !name || orderIndex === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: id, projectId, name, orderIndex" },
        { status: 400 }
      );
    }

    const now = new Date();
    await db.insert(scenes).values({
      id,
      projectId,
      name,
      isMain: isMain || false,
      orderIndex,
      createdAt: now,
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      scene: {
        id,
        name,
        isMain: isMain || false,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Create scene error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
