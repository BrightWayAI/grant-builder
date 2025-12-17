import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    const passwordHash = await bcrypt.hash(password, 12);

    // Handle invited users: if user exists but has no password, complete their registration
    if (existingUser) {
      if (existingUser.passwordHash) {
        return NextResponse.json(
          { error: "An account with this email already exists" },
          { status: 400 }
        );
      }

      // User was invited but hasn't set up their account yet - complete registration
      const user = await prisma.user.update({
        where: { email },
        data: {
          name,
          passwordHash,
        },
      });

      return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        organizationId: user.organizationId,
        invited: true,
      });
    }

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
