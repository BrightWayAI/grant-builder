"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/primitives/card";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { Progress } from "@/components/primitives/progress";
import { BillingToggle, PRICING, BillingInterval } from "@/components/subscription/billing-toggle";
import { 
  CreditCard, 
  FileText, 
  Database, 
  Users, 
  Loader2, 
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";

interface SubscriptionData {
  status: "beta" | "trial" | "active" | "past_due" | "canceled" | "unpaid";
  plan: string | null;
  proposalsUsed: number;
  proposalLimit: number;
  storageUsedMB: number;
  storageLimitMB: number;
  documentsCount: number;
  documentsLimit: number;
  teamSize: number;
  teamLimit: number;
  currentPeriodEnd: string | null;
  canCreateProposal: boolean;
  isBeta: boolean;
  seatsPurchased?: number | null;
  seatsUsed?: number | null;
  seatsRemaining?: number | null;
}

export default function BillingPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [teamSeats, setTeamSeats] = useState(3);
  const [showSeatModal, setShowSeatModal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("monthly");

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const res = await fetch("/api/billing");
      if (res.ok) {
        const data = await res.json();
        setSubscription(data);
        if (data.plan === "teams" && data.seatsPurchased) {
          setTeamSeats(Math.max(3, data.seatsPurchased));
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscription:", error);
    } finally {
      setLoading(false);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (
    plan: "individual" | "teams" | "enterprise",
    seatOverride?: number
  ) => {
    setUpgradeLoading(true);
    try {
      const seats = plan === "teams" ? Math.max(3, seatOverride ?? teamSeats) : 1;
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, seats, billingInterval, lockInDiscount: subscription?.isBeta }),
      });
      const data = await res.json();
      
      if (!res.ok) {
        console.error("Checkout error:", data.error);
        alert(data.error || "Failed to start checkout. Please try again.");
        return;
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No checkout URL returned:", data);
        alert("Failed to create checkout session. Please try again.");
      }
    } catch (error) {
      console.error("Failed to start checkout:", error);
      alert("An error occurred. Please try again.");
    } finally {
      setUpgradeLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-text-secondary" />
      </div>
    );
  }

  const statusConfig = {
    beta: { label: "Beta Access", color: "bg-purple-100 text-purple-800", icon: CheckCircle },
    trial: { label: "Free Trial", color: "bg-blue-100 text-blue-800", icon: Clock },
    active: { label: "Active", color: "bg-green-100 text-green-800", icon: CheckCircle },
    past_due: { label: "Past Due", color: "bg-yellow-100 text-yellow-800", icon: AlertCircle },
    canceled: { label: "Canceled", color: "bg-gray-100 text-gray-800", icon: AlertCircle },
    unpaid: { label: "Unpaid", color: "bg-red-100 text-red-800", icon: AlertCircle },
  };

  const status = subscription?.status || "beta";
  const StatusIcon = statusConfig[status].icon;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-title">Billing</h1>
        <p className="text-text-secondary">Manage your subscription and usage</p>
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              {subscription?.isBeta 
                ? "Beta access — usage is free during beta"
                : subscription?.plan 
                ? `${subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} Plan`
                : "Free Trial"}
            </CardDescription>
          </div>
          <Badge className={statusConfig[status].color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusConfig[status].label}
          </Badge>
        </div>
        </CardHeader>
        <CardContent>
          {status === "beta" ? (
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <h3 className="font-medium text-purple-900 mb-2">Welcome to the Beacon Beta!</h3>
                <p className="text-sm text-purple-800 mb-3">
                  You have full access to all features during our beta period. Usage is free.
                </p>
                <ul className="text-sm text-purple-700 space-y-1">
                  <li>• {subscription?.proposalLimit || 5} proposals per month</li>
                  <li>• 500 MB knowledge base storage</li>
                  <li>• 50 documents</li>
                  <li>• Unlimited team members</li>
                </ul>
              </div>
              <p className="text-sm text-text-secondary">
                You can purchase a plan anytime during beta and lock in 20% off your first year. Seats are not enforced while in beta.
              </p>
            </div>
          ) : status === "trial" ? (
            <div className="space-y-4">
              <p className="text-sm text-text-secondary">
                You&apos;re on the free trial. Create your first 3 proposals free, then upgrade to continue.
              </p>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <span className="font-medium">Teams seats</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTeamSeats(Math.max(3, teamSeats - 1))}
                    disabled={teamSeats <= 3}
                  >
                    -
                  </Button>
                  <span className="w-10 text-center font-medium">{teamSeats}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTeamSeats(teamSeats + 1)}
                  >
                    +
                  </Button>
                  <span className="text-xs text-text-tertiary">Min 3 seats</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => handleUpgrade("individual")} disabled={upgradeLoading}>
                  {upgradeLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Upgrade to Individual - $49/mo
                </Button>
                <Button variant="outline" onClick={() => handleUpgrade("teams")} disabled={upgradeLoading}>
                  Upgrade to Teams - ${teamSeats * 29}/mo ({teamSeats} seats)
                </Button>
              </div>
            </div>
          ) : status === "active" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {subscription?.plan === "individual" ? "$49" : "$29/seat"}/month
                  </p>
                  {subscription?.currentPeriodEnd && (
                    <p className="text-sm text-text-secondary">
                      Renews on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button variant="outline" onClick={openBillingPortal} disabled={portalLoading}>
                  {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                  Manage Subscription
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  {status === "past_due" 
                    ? "Your payment failed. Please update your payment method to continue using Beacon."
                    : status === "canceled"
                    ? "Your subscription has been canceled. Upgrade to regain access."
                    : "Your account has unpaid invoices. Please update your payment method."}
                </p>
              </div>
              <Button onClick={openBillingPortal} disabled={portalLoading}>
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Update Payment Method
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Usage This Month</CardTitle>
          <CardDescription>Track your proposal and storage usage</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Proposals */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-secondary" />
                <span>Proposals</span>
              </div>
              <span className="text-text-secondary">
                {subscription?.proposalsUsed || 0} / {subscription?.proposalLimit || 1}
              </span>
            </div>
            <Progress 
              value={((subscription?.proposalsUsed || 0) / (subscription?.proposalLimit || 1)) * 100} 
            />
          </div>

          {/* Storage */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-text-secondary" />
                <span>Knowledge Base Storage</span>
              </div>
              <span className="text-text-secondary">
                {subscription?.storageUsedMB?.toFixed(1) || 0} MB / {subscription?.storageLimitMB || 100} MB
              </span>
            </div>
            <Progress 
              value={((subscription?.storageUsedMB || 0) / (subscription?.storageLimitMB || 100)) * 100} 
            />
          </div>

          {/* Documents */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-text-secondary" />
                <span>Documents</span>
              </div>
              <span className="text-text-secondary">
                {subscription?.documentsCount || 0} / {subscription?.documentsLimit || 10}
              </span>
            </div>
            <Progress 
              value={((subscription?.documentsCount || 0) / (subscription?.documentsLimit || 10)) * 100} 
            />
          </div>

          {/* Team Members */}
          {(subscription?.plan === "teams" || subscription?.plan === "enterprise") && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-text-secondary" />
                  <span>Team Members</span>
                </div>
                <span className="text-text-secondary">
                  {subscription?.teamSize || 1} members
                </span>
              </div>
            </div>
          )}

          {subscription?.plan === "teams" && subscription?.seatsPurchased ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-text-secondary" />
                  <span>Licenses</span>
                </div>
                <span className="text-text-secondary">
                  {subscription?.seatsUsed || 0} / {subscription?.seatsPurchased} seats used
                </span>
              </div>
              <Progress 
                value={((subscription?.seatsUsed || 0) / (subscription?.seatsPurchased || 1)) * 100} 
              />
              <p className="text-xs text-text-tertiary">
                {Math.max(0, (subscription?.seatsRemaining || 0))} seats remaining.
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle>Plan Comparison</CardTitle>
              <CardDescription>Choose the plan that works for your organization</CardDescription>
            </div>
            <BillingToggle value={billingInterval} onChange={setBillingInterval} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg border ${subscription?.plan === "individual" ? "border-brand bg-brand/5" : "border-border"}`}>
              <h3 className="font-semibold mb-1">Individual</h3>
              <p className="text-2xl font-bold">
                {PRICING.individual[billingInterval].label}
                <span className="text-sm font-normal text-text-secondary">{PRICING.individual[billingInterval].sublabel}</span>
              </p>
              {billingInterval === "yearly" && (
                <p className="text-xs text-text-tertiary mb-3">{PRICING.individual.yearly.billed}</p>
              )}
              {billingInterval === "monthly" && <div className="mb-3" />}
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>2 proposals per month</li>
                <li>250 MB knowledge base</li>
                <li>25 documents</li>
                <li>1 team member</li>
                <li>Grant discovery</li>
              </ul>
              <Button 
                className="w-full mt-4" 
                size="sm"
                onClick={() => handleUpgrade("individual")}
                disabled={upgradeLoading}
              >
                Select Plan
              </Button>
            </div>

            <div className={`p-4 rounded-lg border ${subscription?.plan === "teams" ? "border-brand bg-brand/5" : "border-border"}`}>
              <h3 className="font-semibold mb-1">Teams</h3>
              <p className="text-2xl font-bold">
                {PRICING.teams[billingInterval].label}
                <span className="text-sm font-normal text-text-secondary">{PRICING.teams[billingInterval].sublabel}</span>
              </p>
              {billingInterval === "yearly" && (
                <p className="text-xs text-text-tertiary mb-3">{PRICING.teams.yearly.billed}</p>
              )}
              {billingInterval === "monthly" && <div className="mb-3" />}
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>5 proposals per seat</li>
                <li>1 GB shared knowledge base</li>
                <li>100 documents</li>
                <li>Unlimited team members</li>
                <li>Priority support</li>
              </ul>
              <Button 
                className="w-full mt-3" 
                size="sm"
                onClick={() => setShowSeatModal(true)}
                disabled={upgradeLoading}
              >
                Select Plan
              </Button>
            </div>

            <div className={`p-4 rounded-lg border ${subscription?.plan === "enterprise" ? "border-brand bg-brand/5" : "border-border"}`}>
              <h3 className="font-semibold mb-1">Enterprise</h3>
              <p className="text-2xl font-bold">
                {PRICING.enterprise[billingInterval].label}
                <span className="text-sm font-normal text-text-secondary">{PRICING.enterprise[billingInterval].sublabel}</span>
              </p>
              {billingInterval === "yearly" && (
                <p className="text-xs text-text-tertiary mb-3">{PRICING.enterprise.yearly.billed}</p>
              )}
              {billingInterval === "monthly" && <div className="mb-3" />}
              <ul className="space-y-2 text-sm text-text-secondary">
                <li>50 proposals per month</li>
                <li>5 GB knowledge base</li>
                <li>500 documents</li>
                <li>Unlimited team members</li>
                <li>Dedicated support</li>
              </ul>
              <Button 
                className="w-full mt-4" 
                size="sm"
                onClick={() => handleUpgrade("enterprise")}
                disabled={upgradeLoading}
              >
                Select Plan
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {showSeatModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-2">Choose seats</h3>
            <p className="text-sm text-text-secondary mb-4">
              Teams requires at least 3 seats. 
              {billingInterval === "yearly" ? " Billed annually." : " Billed monthly."}
            </p>
            <div className="flex items-center gap-3 mb-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTeamSeats(Math.max(3, teamSeats - 1))}
                disabled={teamSeats <= 3 || upgradeLoading}
              >
                -
              </Button>
              <span className="w-12 text-center font-medium">{teamSeats}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setTeamSeats(teamSeats + 1)}
                disabled={upgradeLoading}
              >
                +
              </Button>
              <span className="text-xs text-text-tertiary">Min 3</span>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowSeatModal(false)} disabled={upgradeLoading}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setShowSeatModal(false);
                  handleUpgrade("teams", teamSeats);
                }}
                disabled={upgradeLoading}
              >
                {billingInterval === "yearly" 
                  ? `Continue - $${Math.max(3, teamSeats) * PRICING.teams.yearly.price}/year`
                  : `Continue - $${Math.max(3, teamSeats) * PRICING.teams.monthly.price}/mo`
                }
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
