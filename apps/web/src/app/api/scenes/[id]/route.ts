import { NextRequest, NextResponse } from "next/server";
import { db, scenes, eq } from "@opencut/db";

// PUT /api/scenes/:id - Update a scene
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

    // Verify the scene exists
    const [existingScene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, id))
      .limit(1);

    if (!existingScene) {
      return NextResponse.json(
        { error: "Scene not found" },
        { status: 404 }
      );
    }

    const { name, isMain, orderIndex } = body;
    const now = new Date();

    await db
      .update(scenes)
      .set({
        name: name !== undefined ? name : existingScene.name,
        isMain: isMain !== undefined ? isMain : existingScene.isMain,
        orderIndex:
          orderIndex !== undefined ? orderIndex : existingScene.orderIndex,
        updatedAt: now,
      })
      .where(eq(scenes.id, id));

    return NextResponse.json({
      success: true,
      scene: {
        id,
        name: name !== undefined ? name : existingScene.name,
        isMain: isMain !== undefined ? isMain : existingScene.isMain,
        createdAt: existingScene.createdAt.toISOString(),
        updatedAt: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Update scene error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/scenes/:id - Delete a scene
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the scene exists
    const [existingScene] = await db
      .select()
      .from(scenes)
      .where(eq(scenes.id, id))
      .limit(1);

    if (!existingScene) {
      return NextResponse.json(
        { error: "Scene not found" },
        { status: 404 }
      );
    }

    // Prevent deleting the main scene
    if (existingScene.isMain) {
      return NextResponse.json(
        { error: "Cannot delete the main scene" },
        { status: 400 }
      );
    }

    // Delete will cascade to timelines table
    await db.delete(scenes).where(eq(scenes.id, id));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete scene error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
