import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const [userCount, orgCount, docCount, proposalCount, feedbackCount, feedback] = await Promise.all([
    prisma.user.count(),
    prisma.organization.count(),
    prisma.document.count(),
    prisma.proposal.count(),
    prisma.feedback.count(),
    prisma.feedback.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        user: { select: { email: true, name: true } },
        organization: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-title">Admin</h1>
        <p className="text-text-secondary">Metrics and recent feedback</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard label="Users" value={userCount} />
        <MetricCard label="Organizations" value={orgCount} />
        <MetricCard label="Documents" value={docCount} />
        <MetricCard label="Proposals" value={proposalCount} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Feedback</CardTitle>
            <CardDescription>Latest 10 submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-text-secondary">Total feedback: {feedbackCount}</div>
            <div className="space-y-3">
              {feedback.map((f) => (
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
              {feedback.length === 0 && <p className="text-sm text-text-secondary">No feedback yet.</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-display">{value}</CardTitle>
      </CardHeader>
      <CardContent />
    </Card>
  );
}
