import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import Link from "next/link";
import { AlertTriangle, TrendingUp, Users, Activity } from "lucide-react";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

// Calculate edit rate: how much users modify AI-generated content
function calculateEditRate(sections: { content: string; generatedContent: string | null }[]): number {
  const sectionsWithGenerated = sections.filter(s => s.generatedContent && s.content);
  if (sectionsWithGenerated.length === 0) return 0;
  
  let totalEditDistance = 0;
  for (const section of sectionsWithGenerated) {
    const generated = section.generatedContent || "";
    const final = section.content;
    // Simple edit rate: character difference ratio
    const maxLen = Math.max(generated.length, final.length);
    if (maxLen === 0) continue;
    const diff = Math.abs(generated.length - final.length) + 
      (generated === final ? 0 : Math.min(generated.length, final.length) * 0.1);
    totalEditDistance += diff / maxLen;
  }
  
  return Math.round((totalEditDistance / sectionsWithGenerated.length) * 100);
}

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const now = new Date();
  const oneDayAgo = new Date(now);
  oneDayAgo.setDate(now.getDate() - 1);
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
    // Error metrics
    errorCount7d,
    errorsByType,
    recentErrors,
    // Engagement metrics
    activeUsers1d,
    activeUsers7d,
    activeUsers30d,
    // Quality metrics
    allSections,
    proposalsByStatus,
    savedGrantsCount,
    avgMatchScore,
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
    // Error metrics (wrapped in catch for when table doesn't exist yet)
    prisma.errorLog.count({ where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => 0),
    prisma.errorLog.groupBy({ by: ["errorType"], _count: true, where: { createdAt: { gte: sevenDaysAgo } } }).catch(() => []),
    prisma.errorLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        errorType: true,
        message: true,
        endpoint: true,
        organizationId: true,
        createdAt: true,
        resolved: true,
      },
    }).catch(() => []),
    // Engagement: users with activity (updated proposals/docs) in timeframe
    prisma.user.count({ where: { updatedAt: { gte: oneDayAgo } } }),
    prisma.user.count({ where: { updatedAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { updatedAt: { gte: thirtyDaysAgo } } }),
    // Quality metrics
    prisma.proposalSection.findMany({
      where: { generatedContent: { not: null } },
      select: { content: true, generatedContent: true },
      take: 500,
    }),
    prisma.proposal.groupBy({ by: ["status"], _count: true }),
    prisma.savedGrant.count(),
    prisma.savedGrant.aggregate({ _avg: { matchScore: true } }),
  ]);

  // Calculate derived metrics
  const editRate = calculateEditRate(allSections);
  const submittedProposals = proposalsByStatus.find(p => p.status === "SUBMITTED")?._count || 0;
  const draftProposals = proposalsByStatus.find(p => p.status === "DRAFT")?._count || 0;
  const completionRate = proposalCount > 0 ? Math.round((submittedProposals / proposalCount) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Admin</h1>
        <p className="text-text-secondary">Metrics, subscriptions, and recent feedback</p>
      </div>

      {/* Overview Stats */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Users" value={userCount} delta={newUsers7d} deltaLabel="last 7d" />
        <MetricCard label="Organizations" value={orgCount} delta={newOrgs7d} deltaLabel="last 7d" />
        <MetricCard label="Documents" value={docCount} />
        <MetricCard label="Proposals" value={proposalCount} />
      </div>

      {/* Errors Section */}
      {errorCount7d > 0 && (
        <Card className="border-rose-200 bg-rose-50/50">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <CardTitle className="text-rose-900">Errors (Last 7 Days)</CardTitle>
            </div>
            <CardDescription className="text-rose-700">
              {errorCount7d} errors logged
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              {errorsByType.map((e) => (
                <div key={e.errorType} className="text-sm">
                  <span className="font-medium text-rose-800">{e._count}</span>
                  <span className="text-rose-600 ml-1">{e.errorType.replace("_", " ").toLowerCase()}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {recentErrors.slice(0, 5).map((err) => (
                <div key={err.id} className="text-sm border border-rose-200 rounded p-2 bg-white">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px]">{err.errorType}</Badge>
                    <span className="text-xs text-rose-500">{err.createdAt.toLocaleString()}</span>
                  </div>
                  <p className="text-rose-800 mt-1 truncate">{err.message}</p>
                  {err.endpoint && (
                    <p className="text-xs text-rose-500">{err.endpoint}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Engagement & Quality Metrics */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-brand" />
              <CardTitle>Engagement</CardTitle>
            </div>
            <CardDescription>Active users by timeframe</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{activeUsers1d}</div>
                <div className="text-xs text-text-secondary">DAU</div>
              </div>
              <div className="text-center p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{activeUsers7d}</div>
                <div className="text-xs text-text-secondary">WAU</div>
              </div>
              <div className="text-center p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{activeUsers30d}</div>
                <div className="text-xs text-text-secondary">MAU</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">Saved Grants</span>
                <span className="font-medium">{savedGrantsCount}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-brand" />
              <CardTitle>Quality Metrics</CardTitle>
            </div>
            <CardDescription>AI output and proposal health</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{editRate}%</div>
                <div className="text-xs text-text-secondary">Edit Rate</div>
                <div className="text-[10px] text-text-tertiary">How much users modify AI content</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{completionRate}%</div>
                <div className="text-xs text-text-secondary">Completion Rate</div>
                <div className="text-[10px] text-text-tertiary">Draft to submitted</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{Math.round(avgMatchScore._avg?.matchScore || 0)}</div>
                <div className="text-xs text-text-secondary">Avg Match Score</div>
                <div className="text-[10px] text-text-tertiary">Saved grants quality</div>
              </div>
              <div className="p-3 bg-surface-subtle rounded-lg">
                <div className="text-2xl font-bold font-display">{allSections.length}</div>
                <div className="text-xs text-text-secondary">AI Generations</div>
                <div className="text-[10px] text-text-tertiary">Sections with AI content</div>
              </div>
            </div>
          </CardContent>
        </Card>
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
