import { NextRequest, NextResponse } from "next/server";
import { db, projects, eq } from "@opencut/db";

// GET /api/projects/:id - Get a single project
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

    // Transform the project to match the client format
    const formattedProject = {
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      ...(project.metadata as Record<string, unknown>),
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
      scenes,
      currentSceneId,
      backgroundColor,
      backgroundType,
      blurIntensity,
      bookmarks,
      fps,
      canvasSize,
      canvasMode,
    } = body;

    // Store the project metadata as JSON
    const metadata = {
      scenes,
      currentSceneId,
      backgroundColor,
      backgroundType,
      blurIntensity,
      bookmarks,
      fps,
      canvasSize,
      canvasMode,
    };

    const now = new Date();
    await db
      .update(projects)
      .set({
        name: name || existingProject.name,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        metadata,
        version: existingProject.version + 1,
        updatedAt: updatedAt ? new Date(updatedAt) : now,
      })
      .where(eq(projects.id, id));

    return NextResponse.json({
      success: true,
      project: {
        id,
        name: name || existingProject.name,
        thumbnail: thumbnail !== undefined ? thumbnail : existingProject.thumbnail,
        createdAt: existingProject.createdAt.toISOString(),
        updatedAt: updatedAt || now.toISOString(),
        ...metadata,
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
