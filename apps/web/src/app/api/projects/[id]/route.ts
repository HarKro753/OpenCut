import { NextRequest, NextResponse } from "next/server";
import { db, projects, scenes, projectSettings, eq } from "@opencut/db";

// GET /api/projects/:id - Get a single project with scenes and settings
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const [project] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Fetch scenes and settings from normalized tables
    const projectScenes = await db
      .select()
      .from(scenes)
      .where(eq(scenes.projectId, id))
      .orderBy(scenes.orderIndex);

    const [settings] = await db
      .select()
      .from(projectSettings)
      .where(eq(projectSettings.projectId, id))
      .limit(1);

    const metadata = project.metadata as Record<string, any> | null;

    // Format scenes
    const formattedScenes = projectScenes.length > 0
      ? projectScenes.map((scene) => ({
          id: scene.id,
          name: scene.name,
          isMain: scene.isMain,
          createdAt: scene.createdAt.toISOString(),
          updatedAt: scene.updatedAt.toISOString(),
        }))
      : (metadata?.scenes || []);

    // Transform the project to match the client format
    const formattedProject = {
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
      scenes: formattedScenes,
      currentSceneId: settings?.currentSceneId || metadata?.currentSceneId || "",
      bookmarks: settings?.bookmarks || metadata?.bookmarks || [],
    };

    return NextResponse.json({
      success: true,
      project: formattedProject,
    });
  } catch (error) {
    console.error("Get project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/projects/:id - Update a project
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      );
    }

    // Verify the project exists
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    const {
      name,
      thumbnail,
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

    const now = new Date();

    // Update project with normalized fields
    await db
      .update(projects)
      .set({
        name: name !== undefined ? name : existingProject.name,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        backgroundColor: backgroundColor !== undefined ? backgroundColor : existingProject.backgroundColor,
        backgroundType: backgroundType !== undefined ? backgroundType : existingProject.backgroundType,
        blurIntensity: blurIntensity !== undefined ? blurIntensity : existingProject.blurIntensity,
        fps: fps !== undefined ? fps : existingProject.fps,
        canvasWidth: canvasSize?.width !== undefined ? canvasSize.width : existingProject.canvasWidth,
        canvasHeight: canvasSize?.height !== undefined ? canvasSize.height : existingProject.canvasHeight,
        canvasMode: canvasMode !== undefined ? canvasMode : existingProject.canvasMode,
        // Keep metadata for backwards compatibility
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
        version: existingProject.version + 1,
        updatedAt: updatedAt ? new Date(updatedAt) : now,
      })
      .where(eq(projects.id, id));

    // Update project settings if provided
    if (currentSceneId !== undefined || bookmarks !== undefined) {
      const [existingSettings] = await db
        .select()
        .from(projectSettings)
        .where(eq(projectSettings.projectId, id))
        .limit(1);

      if (existingSettings) {
        await db
          .update(projectSettings)
          .set({
            currentSceneId: currentSceneId !== undefined ? currentSceneId : existingSettings.currentSceneId,
            bookmarks: bookmarks !== undefined ? bookmarks : existingSettings.bookmarks,
            updatedAt: now,
          })
          .where(eq(projectSettings.projectId, id));
      }
    }

    return NextResponse.json({
      success: true,
      project: {
        id,
        name: name !== undefined ? name : existingProject.name,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        createdAt: existingProject.createdAt.toISOString(),
        updatedAt: (updatedAt ? new Date(updatedAt) : now).toISOString(),
        backgroundColor: backgroundColor !== undefined ? backgroundColor : existingProject.backgroundColor,
        backgroundType: backgroundType !== undefined ? backgroundType : existingProject.backgroundType,
        blurIntensity: blurIntensity !== undefined ? blurIntensity : existingProject.blurIntensity,
        fps: fps !== undefined ? fps : existingProject.fps,
        canvasSize: {
          width: canvasSize?.width !== undefined ? canvasSize.width : existingProject.canvasWidth,
          height: canvasSize?.height !== undefined ? canvasSize.height : existingProject.canvasHeight,
        },
        canvasMode: canvasMode !== undefined ? canvasMode : existingProject.canvasMode,
        scenes: scenesData,
        currentSceneId,
        bookmarks,
        version: existingProject.version + 1,
      },
    });
  } catch (error) {
    console.error("Update project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/:id - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the project exists
    const [existingProject] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existingProject) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    await db
      .delete(projects)
      .where(eq(projects.id, id));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete project error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
