import { NextRequest, NextResponse } from "next/server";
import { db, media, eq } from "@opencut/db";

// DELETE /api/media/:id - Delete media metadata
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the media exists
    const [existingMedia] = await db
      .select()
      .from(media)
      .where(eq(media.id, id))
      .limit(1);

    if (!existingMedia) {
      return NextResponse.json(
        { error: "Media not found" },
        { status: 404 }
      );
    }

    await db.delete(media).where(eq(media.id, id));

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Delete media error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
