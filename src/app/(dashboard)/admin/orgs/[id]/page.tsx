import { redirect } from "next/navigation";
import Link from "next/link";
import prisma from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export default async function OrgDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const orgId = params.id;

  const [org, docAgg, proposalByStatus, docByStatus] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        subscriptionStatus: true,
        seatsPurchased: true,
        proposalsUsedThisMonth: true,
        createdAt: true,
        updatedAt: true,
        budgetRange: true,
        orgType: true,
        geographicFocus: true,
        _count: {
          select: { users: true, documents: true, proposals: true, savedGrants: true, feedback: true },
        },
        users: {
          orderBy: { createdAt: "asc" },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        documents: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, filename: true, status: true, documentType: true, fileSize: true, createdAt: true },
        },
        proposals: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, title: true, status: true, createdAt: true },
        },
        feedback: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: { id: true, sentiment: true, createdAt: true },
        },
      },
    }),
    prisma.document.aggregate({
      where: { organizationId: orgId },
      _sum: { fileSize: true },
    }),
    prisma.proposal.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
    prisma.document.groupBy({ by: ["status"], where: { organizationId: orgId }, _count: true }),
  ]);

  if (!org) {
    return (
      <div className="space-y-4">
        <h1 className="text-title">Organization not found</h1>
        <Link href="/admin" className="text-brand underline">Back to admin</Link>
      </div>
    );
  }

  const storageMb = ((docAgg._sum.fileSize || 0) / (1024 * 1024)).toFixed(1);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-title flex items-center gap-2">
            {org.name}
            <StatusBadge status={org.subscriptionStatus} />
          </h1>
          <p className="text-text-secondary text-sm">
            Created {org.createdAt.toLocaleDateString()} • Updated {org.updatedAt.toLocaleDateString()}
          </p>
          <p className="text-text-secondary text-sm mt-1">
            Plan seats: {org.seatsPurchased ?? "-"} • Proposals used this month: {org.proposalsUsedThisMonth ?? 0}
          </p>
        </div>
        <Link href="/admin" className="text-sm text-brand underline">Back to admin</Link>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <MetricCard label="Users" value={org._count.users} />
        <MetricCard label="Documents" value={org._count.documents} helper={`${storageMb} MB stored`} />
        <MetricCard label="Proposals" value={org._count.proposals} helper={`Used this month: ${org.proposalsUsedThisMonth ?? 0}`} />
        <MetricCard label="Saved grants" value={org._count.savedGrants} />
        <MetricCard label="Feedback" value={org._count.feedback} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Proposal status</CardTitle>
            <CardDescription>Counts by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {proposalByStatus.map((p) => (
              <Row key={p.status} label={p.status.toLowerCase()} value={p._count} />
            ))}
            {proposalByStatus.length === 0 && <div className="text-sm text-text-secondary">No proposals yet.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Document status</CardTitle>
            <CardDescription>Counts by status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {docByStatus.map((d) => (
              <Row key={d.status} label={d.status.toLowerCase()} value={d._count} />
            ))}
            {docByStatus.length === 0 && <div className="text-sm text-text-secondary">No documents yet.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>Members in this organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {org.users.map((u) => (
              <div key={u.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">{u.email}</div>
                  <div className="text-xs text-text-secondary">{u.name || "(no name)"}</div>
                </div>
                <div className="text-xs text-text-tertiary text-right">
                  {u.role}
                  <div>{u.createdAt.toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {org.users.length === 0 && <div className="text-sm text-text-secondary">No users.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent feedback</CardTitle>
            <CardDescription>Latest entries</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {org.feedback.map((f) => (
              <div key={f.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                <span className="capitalize">{f.sentiment.toLowerCase()}</span>
                <span className="text-xs text-text-tertiary">{f.createdAt.toLocaleDateString()}</span>
              </div>
            ))}
            {org.feedback.length === 0 && <div className="text-sm text-text-secondary">No feedback.</div>}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Recent documents</CardTitle>
            <CardDescription>Last 5 uploads</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {org.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">{d.filename}</div>
                  <div className="text-xs text-text-secondary">{d.documentType.toLowerCase()} • {d.status.toLowerCase()}</div>
                </div>
                <div className="text-xs text-text-tertiary text-right">
                  {(d.fileSize / (1024 * 1024)).toFixed(1)} MB
                  <div>{d.createdAt.toLocaleDateString()}</div>
                </div>
              </div>
            ))}
            {org.documents.length === 0 && <div className="text-sm text-text-secondary">No documents.</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent proposals</CardTitle>
            <CardDescription>Last 5 drafts/submissions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {org.proposals.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm border border-border rounded-md px-3 py-2">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary truncate">{p.title}</div>
                  <div className="text-xs text-text-secondary">{p.status.toLowerCase()}</div>
                </div>
                <div className="text-xs text-text-tertiary text-right">{p.createdAt.toLocaleDateString()}</div>
              </div>
            ))}
            {org.proposals.length === 0 && <div className="text-sm text-text-secondary">No proposals.</div>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: number; helper?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-display">{value}</CardTitle>
      </CardHeader>
      <CardContent>
        {helper && <div className="text-xs text-text-secondary">{helper}</div>}
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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="capitalize text-text-primary">{label}</span>
      <span className="text-text-primary font-medium">{value}</span>
    </div>
  );
}
