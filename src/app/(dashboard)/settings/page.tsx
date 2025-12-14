import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { OrganizationSettings } from "@/components/settings/organization-settings";
import { GrantDigestSettings } from "@/components/settings/grant-digest-settings";
import { TeamSettings } from "@/components/settings/team-settings";

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
        <h1 className="text-title">Settings</h1>
        <p className="text-text-secondary">Manage your organization settings</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Profile</CardTitle>
          <CardDescription>
            Update your organization details used in proposals and grant matching
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrganizationSettings organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Invite colleagues to collaborate on grant proposals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TeamSettings currentUserId={user.id} currentUserRole={user.role} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifications</CardTitle>
          <CardDescription>
            Manage how you receive updates about grant opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GrantDigestSettings />
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
              <span className="text-sm font-medium text-text-primary">Name:</span>
              <span className="text-sm ml-2 text-text-secondary">{user.name}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-text-primary">Email:</span>
              <span className="text-sm ml-2 text-text-secondary">{user.email}</span>
            </div>
            <div>
              <span className="text-sm font-medium text-text-primary">Role:</span>
              <span className="text-sm ml-2 text-text-secondary capitalize">{user.role}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
