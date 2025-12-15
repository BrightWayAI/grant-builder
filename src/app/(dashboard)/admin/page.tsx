import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import Link from "next/link";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);

  const [
    userCount,
    orgCount,
    docCount,
    proposalCount,
    feedbackCount,
    newUsers7d,
    newOrgs7d,
    feedbackBySentiment,
    subsByStatus,
    recentFeedback,
    recentOrgs,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.document.count(),
    prisma.proposal.count(),
    prisma.feedback.count(),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.organization.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.feedback.groupBy({ by: ["sentiment"], _count: true }),
    prisma.organization.groupBy({ by: ["subscriptionStatus"], _count: true }),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        user: { select: { email: true, name: true } },
        organization: { select: { name: true } },
      },
    }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        name: true,
        createdAt: true,
        subscriptionStatus: true,
        seatsPurchased: true,
        proposalsUsedThisMonth: true,
        _count: { select: { users: true, documents: true, proposals: true } },
      },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      where: { createdAt: { gte: sevenDaysAgo } },
      take: 6,
      select: { id: true, email: true, name: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Admin</h1>
        <p className="text-text-secondary">Metrics, subscriptions, and recent feedback</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Users" value={userCount} delta={newUsers7d} deltaLabel="last 7d" />
        <MetricCard label="Organizations" value={orgCount} delta={newOrgs7d} deltaLabel="last 7d" />
        <MetricCard label="Documents" value={docCount} />
        <MetricCard label="Proposals" value={proposalCount} />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Recent orgs with usage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-text-secondary">Total orgs: {orgCount}</div>
            <div className="divide-y divide-border rounded-md border border-border overflow-hidden">
              {recentOrgs.map((org) => (
                <Link
                  key={org.id}
                  href={`/admin/orgs/${org.id}`}
                  className="flex items-center justify-between px-3 py-3 hover:bg-surface-strong/70 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary truncate">{org.name}</span>
                      <StatusBadge status={org.subscriptionStatus} />
                    </div>
                    <div className="text-xs text-text-secondary">
                      {org._count.users} users · {org._count.documents} docs · {org._count.proposals} proposals
                    </div>
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Created {org.createdAt.toLocaleDateString()}
                  </div>
                </Link>
              ))}
              {recentOrgs.length === 0 && (
                <div className="px-3 py-3 text-sm text-text-secondary">No organizations yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>Status counts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {subsByStatus.map((s) => (
              <div key={s.subscriptionStatus} className="flex items-center justify-between text-sm">
                <StatusBadge status={s.subscriptionStatus} />
                <span className="text-text-primary font-medium">{s._count}</span>
              </div>
            ))}
            {subsByStatus.length === 0 && (
              <div className="text-sm text-text-secondary">No subscription data yet.</div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>Latest submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <span>Total: {feedbackCount}</span>
              <SentimentDots data={feedbackBySentiment} />
            </div>
            <div className="space-y-3">
              {recentFeedback.map((f) => (
                <div key={f.id} className="border border-border rounded-md p-3">
                  <div className="flex items-center gap-2 text-sm mb-1">
                    <Badge variant="secondary" className="text-[11px] capitalize">{f.sentiment.toLowerCase()}</Badge>
                    <span className="text-text-primary font-medium truncate">
                      {f.organization?.name || "Org unknown"}
                    </span>
                  </div>
                  <div className="text-xs text-text-secondary mb-1">
                    {f.user?.email || "Unknown user"} • {f.pageUrl || "(no page)"}
                  </div>
                  <div className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                    {f.message || "(no message)"}
                  </div>
                  <div className="text-[11px] text-text-tertiary mt-1">{f.createdAt.toLocaleString()}</div>
                </div>
              ))}
              {recentFeedback.length === 0 && <p className="text-sm text-text-secondary">No feedback yet.</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent signups</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {recentUsers.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-text-primary">{u.email}</span>
                <span className="text-xs text-text-tertiary">{u.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, delta, deltaLabel }: { label: string; value: number; delta?: number; deltaLabel?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-display">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        {typeof delta === "number" && deltaLabel && (
          <div className="text-xs text-text-secondary">+{delta} {deltaLabel}</div>
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    BETA: "bg-purple-100 text-purple-800 border-purple-200",
    TRIAL: "bg-amber-100 text-amber-800 border-amber-200",
    ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
    PAST_DUE: "bg-rose-100 text-rose-800 border-rose-200",
    CANCELED: "bg-slate-100 text-slate-700 border-slate-200",
    UNPAID: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${colors[status] || "bg-slate-100 text-slate-700 border-slate-200"}`}>
      {status.toLowerCase()}
    </span>
  );
}

function SentimentDots({
  data,
}: {
  data: { sentiment: string; _count: number }[];
}) {
  const total = data.reduce((sum, item) => sum + item._count, 0) || 1;
  const colors: Record<string, string> = {
    POSITIVE: "bg-emerald-400",
    NEUTRAL: "bg-amber-400",
    NEGATIVE: "bg-rose-400",
  };
  return (
    <div className="flex items-center gap-2">
      {data.map((item) => (
        <div key={item.sentiment} className="flex items-center gap-1 text-xs text-text-secondary">
          <span className={`h-2 w-2 rounded-full ${colors[item.sentiment] || "bg-slate-400"}`} />
          <span>
            {item.sentiment.toLowerCase()}: {item._count} ({Math.round((item._count / total) * 100)}%)
          </span>
        </div>
      ))}
    </div>
  );
}
