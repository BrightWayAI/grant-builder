import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { z } from "zod";

// PATCH - Update member role
const updateSchema = z.object({
  role: z.enum(["admin", "member"]),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can update member roles" },
        { status: 403 }
      );
    }

    const { memberId } = params;

    // Can't change your own role
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 400 }
      );
    }

    // Verify member belongs to same organization
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const body = await req.json();
    const { role } = updateSchema.parse(body);

    const updatedMember = await prisma.user.update({
      where: { id: memberId },
      data: { role },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ member: updatedMember });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error updating member:", error);
    return NextResponse.json(
      { error: "Failed to update member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from organization
export async function DELETE(
  req: NextRequest,
  { params }: { params: { memberId: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }
    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Only admins can remove team members" },
        { status: 403 }
      );
    }

    const { memberId } = params;

    // Can't remove yourself
    if (memberId === user.id) {
      return NextResponse.json(
        { error: "You cannot remove yourself from the organization" },
        { status: 400 }
      );
    }

    // Verify member belongs to same organization
    const member = await prisma.user.findFirst({
      where: {
        id: memberId,
        organizationId: user.organizationId,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Remove from organization (don't delete the user)
    await prisma.user.update({
      where: { id: memberId },
      data: {
        organizationId: null,
        role: "member", // Reset role
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Failed to remove member" },
      { status: 500 }
    );
  }
}
