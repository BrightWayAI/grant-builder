import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

type Period = "day" | "week" | "month";

const periodLabels: Record<Period, string> = {
  day: "Daily Active Users (DAU)",
  week: "Weekly Active Users (WAU)",
  month: "Monthly Active Users (MAU)",
};

const periodDescriptions: Record<Period, string> = {
  day: "Users active in the last 24 hours",
  week: "Users active in the last 7 days",
  month: "Users active in the last 30 days",
};

export default async function ActiveUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const params = await searchParams;
  const period = (params.period as Period) || "day";
  
  const now = new Date();
  const cutoff = new Date(now);
  
  if (period === "day") {
    cutoff.setDate(now.getDate() - 1);
  } else if (period === "week") {
    cutoff.setDate(now.getDate() - 7);
  } else {
    cutoff.setDate(now.getDate() - 30);
  }

  const activeUsers = await prisma.user.findMany({
    where: {
      updatedAt: { gte: cutoff },
    },
    orderBy: { updatedAt: "desc" },
    include: {
      organization: {
        select: { id: true, name: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin" className="text-text-secondary hover:text-text-primary transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-title">{periodLabels[period]}</h1>
          <p className="text-text-secondary">{activeUsers.length} active users</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["day", "week", "month"] as Period[]).map((p) => (
          <Link
            key={p}
            href={`/admin/users/active?period=${p}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              period === p
                ? "bg-brand text-white"
                : "bg-surface-subtle text-text-secondary hover:bg-surface-strong"
            }`}
          >
            {p === "day" ? "DAU" : p === "week" ? "WAU" : "MAU"}
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{periodLabels[period]}</CardTitle>
          <CardDescription>{periodDescriptions[period]}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Organization</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Last Active</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Joined</th>
                </tr>
              </thead>
              <tbody>
                {activeUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border hover:bg-surface-subtle transition-colors">
                    <td className="py-3 px-4 text-text-primary">{u.email}</td>
                    <td className="py-3 px-4 text-text-primary">{u.name || "—"}</td>
                    <td className="py-3 px-4">
                      {u.organization ? (
                        <Link
                          href={`/admin/orgs/${u.organization.id}`}
                          className="text-brand hover:underline"
                        >
                          {u.organization.name}
                        </Link>
                      ) : (
                        <span className="text-text-tertiary">No org</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.role === "admin" 
                          ? "bg-purple-100 text-purple-800" 
                          : "bg-slate-100 text-slate-700"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text-secondary">
                      {u.updatedAt.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{u.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {activeUsers.length === 0 && (
            <p className="text-center py-8 text-text-secondary">No active users in this period.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
