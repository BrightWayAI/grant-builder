import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { hasSeenWelcome: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update welcome status:", error);
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
