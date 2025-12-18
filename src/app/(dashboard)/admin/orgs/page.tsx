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

export default async function OrganizationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { users: true, documents: true, proposals: true, savedGrants: true },
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
          <h1 className="text-title">All Organizations</h1>
          <p className="text-text-secondary">{organizations.length} total organizations</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
          <CardDescription>All organizations in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Users</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Documents</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Proposals</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Saved Grants</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Proposals/Mo</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr key={org.id} className="border-b border-border hover:bg-surface-subtle transition-colors">
                    <td className="py-3 px-4">
                      <Link
                        href={`/admin/orgs/${org.id}`}
                        className="text-brand hover:underline font-medium"
                      >
                        {org.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge status={org.subscriptionStatus} />
                    </td>
                    <td className="py-3 px-4 text-text-primary">{org._count.users}</td>
                    <td className="py-3 px-4 text-text-primary">{org._count.documents}</td>
                    <td className="py-3 px-4 text-text-primary">{org._count.proposals}</td>
                    <td className="py-3 px-4 text-text-primary">{org._count.savedGrants}</td>
                    <td className="py-3 px-4 text-text-primary">{org.proposalsUsedThisMonth}</td>
                    <td className="py-3 px-4 text-text-secondary">{org.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {organizations.length === 0 && (
            <p className="text-center py-8 text-text-secondary">No organizations found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
