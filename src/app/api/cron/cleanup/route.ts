import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

// Cleanup old data - run daily via cron
// Vercel/Railway cron: 0 3 * * * (3am daily)
export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, number> = {};

  try {
    // Clean up login attempts older than 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const loginAttempts = await prisma.loginAttempt.deleteMany({
      where: {
        createdAt: { lt: oneDayAgo },
      },
    });
    results.loginAttempts = loginAttempts.count;

    // Clean up old audit logs (keep 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const auditLogs = await prisma.auditLog.deleteMany({
      where: {
        createdAt: { lt: ninetyDaysAgo },
      },
    });
    results.auditLogs = auditLogs.count;

    // Clean up old error logs (keep 30 days, keep unresolved)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const errorLogs = await prisma.errorLog.deleteMany({
      where: {
        createdAt: { lt: thirtyDaysAgo },
        resolved: true,
      },
    });
    results.errorLogs = errorLogs.count;

    // Clean up expired sessions
    const expiredSessions = await prisma.session.deleteMany({
      where: {
        expires: { lt: new Date() },
      },
    });
    results.expiredSessions = expiredSessions.count;

    return NextResponse.json({
      success: true,
      cleaned: results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Cleanup cron error:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: String(error) },
      { status: 500 }
    );
  }
}
