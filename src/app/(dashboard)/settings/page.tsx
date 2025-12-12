import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrganizationSettings } from "@/components/settings/organization-settings";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user?.organizationId) return null;

  const organization = await prisma.organization.findUnique({
    where: { id: user.organizationId },
  });

  if (!organization) return null;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600">Manage your organization settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            Update your organization details used in proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettings organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium">Name:</span>
              <span className="text-sm ml-2">{user.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Email:</span>
              <span className="text-sm ml-2">{user.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium">Role:</span>
              <span className="text-sm ml-2 capitalize">{user.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
