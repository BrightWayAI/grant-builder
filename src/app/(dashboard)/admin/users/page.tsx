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

export default async function UsersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const isAdmin = user.role === "admin" || adminEmails.includes((user.email || "").toLowerCase());
  if (!isAdmin) redirect("/dashboard");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
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
          <h1 className="text-title">All Users</h1>
          <p className="text-text-secondary">{users.length} total users</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>All registered users in the system</CardDescription>
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
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Created</th>
                  <th className="text-left py-3 px-4 font-medium text-text-secondary">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
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
                    <td className="py-3 px-4 text-text-secondary">{u.createdAt.toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-text-secondary">{u.updatedAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <p className="text-center py-8 text-text-secondary">No users found.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
