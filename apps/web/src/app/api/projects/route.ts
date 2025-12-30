import { NextRequest, NextResponse } from "next/server";
import { db, projects } from "@opencut/db";
import { desc } from "drizzle-orm";

// POST /api/projects - Create a new project
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

    if (!id || !name) {
      return NextResponse.json(
        { error: "Missing required fields: id, name" },
        { status: 400 }
      );
    }

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
    await db.insert(projects).values({
      id,
      name,
      thumbnail: thumbnail || null,
      metadata,
      version: 1,
      createdAt: createdAt ? new Date(createdAt) : now,
      updatedAt: updatedAt ? new Date(updatedAt) : now,
    });

    return NextResponse.json({
      success: true,
      project: {
        id,
        name,
        thumbnail,
        createdAt,
        updatedAt,
        ...metadata,
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
    const formattedProjects = userProjects.map((project) => ({
      id: project.id,
      name: project.name,
      thumbnail: project.thumbnail,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
      ...(project.metadata as Record<string, unknown>),
    }));

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
