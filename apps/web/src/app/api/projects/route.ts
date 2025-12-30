import { NextRequest, NextResponse } from "next/server";
import { db, projects, scenes, projectSettings } from "@opencut/db";
import { desc } from "drizzle-orm";

// POST /api/projects - Create a new project with initial scene and settings
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
      name,
      thumbnail,
      createdAt,
      updatedAt,
      scenes: scenesData,
      currentSceneId,
      backgroundColor,
      backgroundType,
      blurIntensity,
      bookmarks,
      fps,
      canvasSize,
      canvasMode,
    } = body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: id, name" },
        { status: 400 }
      );
    }

    const now = new Date();

    // Create project with normalized fields
    await db.insert(projects).values({
      id,
      name,
      thumbnail: thumbnail || null,
      backgroundColor: backgroundColor || "#000000",
      backgroundType: backgroundType || "color",
      blurIntensity: blurIntensity || 8,
      fps: fps || 30,
      canvasWidth: canvasSize?.width || 1920,
      canvasHeight: canvasSize?.height || 1080,
      canvasMode: canvasMode || "preset",
      // Store metadata for backwards compatibility during transition
      metadata: {
        scenes: scenesData,
        currentSceneId,
        backgroundColor,
        backgroundType,
        blurIntensity,
        bookmarks,
        fps,
        canvasSize,
        canvasMode,
      },
      version: 1,
      createdAt: createdAt ? new Date(createdAt) : now,
      updatedAt: updatedAt ? new Date(updatedAt) : now,
    });

    // Create scenes if provided
    if (scenesData && Array.isArray(scenesData) && scenesData.length > 0) {
      const sceneValues = scenesData.map((scene: any, index: number) => ({
        id: scene.id,
        projectId: id,
        name: scene.name,
        isMain: scene.isMain || false,
        orderIndex: index,
        createdAt: scene.createdAt ? new Date(scene.createdAt) : now,
        updatedAt: scene.updatedAt ? new Date(scene.updatedAt) : now,
      }));

      await db.insert(scenes).values(sceneValues);
    }

    // Create project settings
    await db.insert(projectSettings).values({
      id: `settings-${id}`,
      projectId: id,
      currentSceneId: currentSceneId || null,
      bookmarks: bookmarks || [],
      updatedAt: now,
    });

    return NextResponse.json({
      success: true,
      project: {
        id,
        name,
        thumbnail,
        createdAt: (createdAt ? new Date(createdAt) : now).toISOString(),
        updatedAt: (updatedAt ? new Date(updatedAt) : now).toISOString(),
        scenes: scenesData,
        currentSceneId,
        backgroundColor: backgroundColor || "#000000",
        backgroundType: backgroundType || "color",
        blurIntensity: blurIntensity || 8,
        bookmarks: bookmarks || [],
        fps: fps || 30,
        canvasSize: canvasSize || { width: 1920, height: 1080 },
        canvasMode: canvasMode || "preset",
      },
    });
  } catch (error) {
    console.error("Create project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/projects - List all projects
export async function GET(request: NextRequest) {
  try {
    const userProjects = await db
      .select()
      .from(projects)
      .orderBy(desc(projects.updatedAt));

    // Transform the projects to match the client format
    // Use normalized columns with fallback to metadata for backwards compatibility
    const formattedProjects = userProjects.map((project) => {
      const metadata = project.metadata as Record<string, any> | null;

      return {
        id: project.id,
        name: project.name,
        thumbnail: project.thumbnail,
        createdAt: project.createdAt.toISOString(),
        updatedAt: project.updatedAt.toISOString(),
        backgroundColor: project.backgroundColor || metadata?.backgroundColor || "#000000",
        backgroundType: project.backgroundType || metadata?.backgroundType || "color",
        blurIntensity: project.blurIntensity || metadata?.blurIntensity || 8,
        fps: project.fps || metadata?.fps || 30,
        canvasSize: {
          width: project.canvasWidth || metadata?.canvasSize?.width || 1920,
          height: project.canvasHeight || metadata?.canvasSize?.height || 1080,
        },
        canvasMode: project.canvasMode || metadata?.canvasMode || "preset",
        // Include metadata fields that will be loaded from separate tables
        scenes: metadata?.scenes || [],
        currentSceneId: metadata?.currentSceneId || "",
        bookmarks: metadata?.bookmarks || [],
      };
    });

    return NextResponse.json({
      success: true,
      projects: formattedProjects,
    });
  } catch (error) {
    console.error("List projects error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
