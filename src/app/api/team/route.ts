import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { sendTeamInviteEmail } from "@/lib/email";
import { getPlanByPriceId } from "@/lib/stripe";
import { z } from "zod";

// GET - List team members
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!user.organizationId) {
      return NextResponse.json({ error: "No organization" }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        stripePriceId: true,
        subscriptionStatus: true,
        seatsPurchased: true,
        _count: { select: { users: true } },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const isBeta = organization.subscriptionStatus === "BETA";
    const plan = organization.stripePriceId
      ? getPlanByPriceId(organization.stripePriceId)
      : null;
    const seatsPurchased = !isBeta && plan === "teams" ? (organization.seatsPurchased || 3) : null;
    const seatsUsed = organization._count.users;
    const seatsRemaining = seatsPurchased !== null ? Math.max(0, seatsPurchased - seatsUsed) : null;

    const members = await prisma.user.findMany({
      where: { organizationId: user.organizationId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        image: true,
        createdAt: true,
      },
      orderBy: [
        { role: "asc" }, // admins first
        { createdAt: "asc" },
      ],
    });

    return NextResponse.json({
      members,
      seats: seatsPurchased !== null ? {
        plan,
        purchased: seatsPurchased,
        used: seatsUsed,
        remaining: seatsRemaining,
      } : undefined,
    });
  } catch (error) {
    console.error("Error fetching team members:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST - Invite a new team member
const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function POST(req: NextRequest) {
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
        { error: "Only admins can invite team members" },
        { status: 403 }
      );
    }

    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        stripePriceId: true,
        subscriptionStatus: true,
        seatsPurchased: true,
        _count: { select: { users: true } },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const isBeta = organization.subscriptionStatus === "BETA";
    const plan = organization.stripePriceId
      ? getPlanByPriceId(organization.stripePriceId)
      : null;
    const seatsPurchased = !isBeta && plan === "teams" ? (organization.seatsPurchased || 3) : null;
    const seatsUsed = organization._count.users;

    if (!isBeta && plan === "teams" && seatsPurchased !== null && seatsUsed >= seatsPurchased) {
      return NextResponse.json(
        { error: `No available licenses. You have ${seatsUsed}/${seatsPurchased} seats assigned.` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { email, role } = inviteSchema.parse(body);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.organizationId === user.organizationId) {
        return NextResponse.json(
          { error: "User is already a member of this organization" },
          { status: 400 }
        );
      }
      if (existingUser.organizationId) {
        return NextResponse.json(
          { error: "User belongs to another organization" },
          { status: 400 }
        );
      }
      
      // Add existing user to organization
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          organizationId: user.organizationId,
          role,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
        },
      });

      try {
        await sendTeamInviteEmail({
          to: email,
          inviterName: user.name || user.email,
          organizationName: organization.name || "your organization",
          role,
        });
      } catch (emailError) {
        console.error("Failed to send invite email to existing user:", emailError);
      }

      const seatSummary = plan === "teams" && seatsPurchased !== null
        ? {
            plan,
            purchased: seatsPurchased,
            used: seatsUsed + 1,
            remaining: Math.max(0, seatsPurchased - (seatsUsed + 1)),
          }
        : undefined;

      return NextResponse.json({ member: updatedUser, invited: true, seats: seatSummary });
    }

    // Create new user with pending invite (they'll set password on first login)
    const newUser = await prisma.user.create({
      data: {
        email,
        role,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    // Send invitation email
    try {
      await sendTeamInviteEmail({
        to: email,
        inviterName: user.name || user.email,
        organizationName: organization?.name || "your organization",
        role,
      });
    } catch (emailError) {
      console.error("Failed to send invite email:", emailError);
      // Don't fail the request if email fails
    }

    const seatSummary = plan === "teams" && seatsPurchased !== null
      ? {
          plan,
          purchased: seatsPurchased,
          used: seatsUsed + 1,
          remaining: Math.max(0, seatsPurchased - (seatsUsed + 1)),
        }
      : undefined;

    return NextResponse.json({ member: newUser, invited: true, seats: seatSummary }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request", details: error.errors },
        { status: 400 }
      );
    }
    console.error("Error inviting team member:", error);
    return NextResponse.json(
      { error: "Failed to invite team member" },
      { status: 500 }
    );
  }
}
