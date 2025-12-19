import prisma from "./db";
import { headers } from "next/headers";
import { RATE_LIMITS } from "./constants";

const { EMAIL_MAX_ATTEMPTS, IP_MAX_ATTEMPTS, LOCKOUT_MINUTES, WINDOW_MINUTES } = RATE_LIMITS;

export async function getClientIp(): Promise<string> {
  const headersList = await headers();
  return (
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headersList.get("x-real-ip") ||
    "unknown"
  );
}

// Record a login attempt
export async function recordLoginAttempt(
  email: string,
  success: boolean
): Promise<void> {
  const ipAddress = await getClientIp();

  await prisma.loginAttempt.create({
    data: {
      email: email.toLowerCase(),
      ipAddress,
      success,
    },
  });
  // Cleanup is handled by /api/cron/cleanup
}

// Check if email is rate limited
export async function isEmailRateLimited(email: string): Promise<{
  limited: boolean;
  remainingAttempts: number;
  lockoutEndsAt?: Date;
}> {
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - WINDOW_MINUTES);

  const recentAttempts = await prisma.loginAttempt.findMany({
    where: {
      email: email.toLowerCase(),
      success: false,
      createdAt: { gte: windowStart },
    },
    orderBy: { createdAt: "desc" },
    take: EMAIL_MAX_ATTEMPTS + 1,
  });

  const failedCount = recentAttempts.length;

  if (failedCount >= EMAIL_MAX_ATTEMPTS) {
    const lastAttempt = recentAttempts[0];
    const lockoutEndsAt = new Date(lastAttempt.createdAt);
    lockoutEndsAt.setMinutes(lockoutEndsAt.getMinutes() + LOCKOUT_MINUTES);

    if (lockoutEndsAt > new Date()) {
      return {
        limited: true,
        remainingAttempts: 0,
        lockoutEndsAt,
      };
    }
  }

  return {
    limited: false,
    remainingAttempts: Math.max(0, EMAIL_MAX_ATTEMPTS - failedCount),
  };
}

// Check if IP is rate limited
export async function isIpRateLimited(): Promise<{
  limited: boolean;
  remainingAttempts: number;
}> {
  const ipAddress = await getClientIp();
  const windowStart = new Date();
  windowStart.setMinutes(windowStart.getMinutes() - WINDOW_MINUTES);

  const recentAttempts = await prisma.loginAttempt.count({
    where: {
      ipAddress,
      success: false,
      createdAt: { gte: windowStart },
    },
  });

  return {
    limited: recentAttempts >= IP_MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, IP_MAX_ATTEMPTS - recentAttempts),
  };
}

// Combined rate limit check
export async function checkRateLimit(email: string): Promise<{
  allowed: boolean;
  reason?: string;
  lockoutEndsAt?: Date;
}> {
  const [emailLimit, ipLimit] = await Promise.all([
    isEmailRateLimited(email),
    isIpRateLimited(),
  ]);

  if (emailLimit.limited) {
    return {
      allowed: false,
      reason: `Too many failed attempts. Try again after ${emailLimit.lockoutEndsAt?.toLocaleTimeString()}.`,
      lockoutEndsAt: emailLimit.lockoutEndsAt,
    };
  }

  if (ipLimit.limited) {
    return {
      allowed: false,
      reason: "Too many login attempts from this IP. Please try again later.",
    };
  }

  return { allowed: true };
}
