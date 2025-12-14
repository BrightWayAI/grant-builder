"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/primitives/button";
import { Input } from "@/components/primitives/input";
import { Badge } from "@/components/primitives/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/primitives/alert-dialog";
import { UserPlus, Trash2, Crown, User, Loader2, Mail } from "lucide-react";

interface TeamMember {
  id: string;
  email: string;
  name: string | null;
  role: string;
  image: string | null;
  createdAt: string;
}

interface SeatInfo {
  plan?: string | null;
  purchased?: number | null;
  used?: number | null;
  remaining?: number | null;
}

interface TeamSettingsProps {
  currentUserId: string;
  currentUserRole: string;
}

export function TeamSettings({ currentUserId, currentUserRole }: TeamSettingsProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [seats, setSeats] = useState<SeatInfo | null>(null);

  const isAdmin = currentUserRole === "admin";

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      const res = await fetch("/api/team");
      if (!res.ok) throw new Error("Failed to fetch team members");
      const data = await res.json();
      setMembers(data.members);
      if (data.seats) {
        setSeats(data.seats);
      }
    } catch (err) {
      setError("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailToInvite = inviteEmail.trim();
    if (!emailToInvite) return;

    setInviting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailToInvite, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to invite member");
      }

      setMembers([...members, data.member]);
      if (data.seats) {
        setSeats(data.seats);
      } else if (seats && seats.purchased) {
        const used = (seats.used || 0) + 1;
        setSeats({ ...seats, used, remaining: Math.max(0, (seats.remaining || 0) - 1) });
      }
      setSuccess(
        data.invited
          ? `Invitation sent to ${emailToInvite}`
          : `${emailToInvite} has been added to your team`
      );
      setInviteEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update role");
      }

      setMembers(
        members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const handleRemove = async (memberId: string) => {
    try {
      const res = await fetch(`/api/team/${memberId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove member");
      }

      setMembers(members.filter((m) => m.id !== memberId));
      setSuccess("Team member removed");
      if (seats?.plan === "teams" && seats.purchased) {
        const used = Math.max(0, (seats.used || 0) - 1);
        setSeats({ ...seats, used, remaining: Math.max(0, seats.purchased - used) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {success}
        </div>
      )}

      {/* Invite Form - Admin only */}
      {isAdmin && (
        <form onSubmit={handleInvite} className="space-y-4">
          {seats?.plan === "teams" ? (
            <div className="p-3 bg-surface-subtle rounded-lg border border-border">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Licenses</span>
                <span className="text-text-secondary">
                  {seats.used || 0} / {seats.purchased || 0} used
                </span>
              </div>
              <p className="text-xs text-text-tertiary mt-1">
                {Math.max(0, seats.remaining || 0)} seats remaining.
              </p>
            </div>
          ) : null}
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                type="email"
                placeholder="colleague@organization.org"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                disabled={inviting}
              />
            </div>
            <Select
              value={inviteRole}
              onValueChange={(v) => setInviteRole(v as "member" | "admin")}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              type="submit"
              disabled={
                inviting ||
                !inviteEmail.trim() ||
                (seats?.plan === "teams" && (seats.remaining ?? 1) <= 0)
              }
            >
              {inviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Invite
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-text-tertiary">
            Invited members will receive an email to set up their account.
          </p>
        </form>
      )}

      {/* Team Members List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-text-secondary">
          Team Members ({members.length})
        </h4>
        <div className="border border-border rounded-lg divide-y divide-border">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-surface-secondary flex items-center justify-center">
                  {member.image ? (
                    <img
                      src={member.image}
                      alt={member.name || member.email}
                      className="h-10 w-10 rounded-full"
                    />
                  ) : (
                    <User className="h-5 w-5 text-text-tertiary" />
                  )}
                </div>

                {/* Info */}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {member.name || member.email}
                    </span>
                    {member.id === currentUserId && (
                      <Badge variant="outline" className="text-xs">
                        You
                      </Badge>
                    )}
                    {!member.name && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Mail className="h-3 w-3" />
                        Pending
                      </Badge>
                    )}
                  </div>
                  {member.name && (
                    <p className="text-sm text-text-secondary">{member.email}</p>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {isAdmin && member.id !== currentUserId ? (
                  <>
                    <Select
                      value={member.role}
                      onValueChange={(v) => handleRoleChange(member.id, v)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Member
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4 text-status-error" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove team member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {member.name || member.email} will lose access to this
                            organization. They can be re-invited later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRemove(member.id)}
                            className="bg-status-error hover:bg-status-error/90"
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : (
                  <Badge
                    variant={member.role === "admin" ? "default" : "secondary"}
                    className="capitalize"
                  >
                    {member.role === "admin" && (
                      <Crown className="h-3 w-3 mr-1" />
                    )}
                    {member.role}
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
