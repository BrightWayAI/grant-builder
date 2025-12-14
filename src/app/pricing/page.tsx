"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { 
  Check, 
  Sparkles, 
  ArrowRight,
  Users,
  FileText,
  Brain,
  Zap,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Starter",
    description: "For small nonprofits getting started with grant writing",
    price: { monthly: 49, annual: 39 },
    features: [
      "3 proposals per month",
      "1 team member",
      "5 GB document storage",
      "Basic RFP parsing",
      "AI draft generation",
      "DOCX export",
      "Email support",
    ],
    limitations: [
      "No grant discovery",
      "No inline copilot",
    ],
    cta: "Start Free Trial",
    popular: false,
  },
  {
    name: "Professional",
    description: "For growing organizations with regular grant applications",
    price: { monthly: 149, annual: 119 },
    features: [
      "15 proposals per month",
      "5 team members",
      "25 GB document storage",
      "Advanced RFP parsing",
      "AI draft generation",
      "Inline AI copilot",
      "Grant discovery (Grants.gov)",
      "Match scoring",
      "DOCX export",
      "Priority email support",
    ],
    limitations: [],
    cta: "Start Free Trial",
    popular: true,
  },
  {
    name: "Enterprise",
    description: "For large organizations with high-volume grant programs",
    price: { monthly: 399, annual: 319 },
    features: [
      "Unlimited proposals",
      "Unlimited team members",
      "100 GB document storage",
      "Advanced RFP parsing",
      "AI draft generation",
      "Inline AI copilot",
      "Grant discovery (all sources)",
      "Match scoring & alerts",
      "Custom integrations",
      "DOCX & PDF export",
      "Dedicated account manager",
      "Phone & video support",
      "Custom training",
    ],
    limitations: [],
    cta: "Contact Sales",
    popular: false,
  },
];

const faqs = [
  {
    question: "Can I try Brightway before committing?",
    answer: "Yes! All plans include a 14-day free trial with full access to features. No credit card required to start.",
  },
  {
    question: "What counts as a proposal?",
    answer: "A proposal is a single grant application project. You can have as many sections and revisions as needed within one proposal. Drafts that you delete don't count toward your limit.",
  },
  {
    question: "Can I change plans later?",
    answer: "Absolutely. You can upgrade or downgrade at any time. When upgrading, you'll get immediate access to new features. When downgrading, changes take effect at your next billing cycle.",
  },
  {
    question: "What happens to my data if I cancel?",
    answer: "Your data remains yours. You can export all proposals and documents before canceling. After cancellation, we retain your data for 30 days in case you change your mind, then it's permanently deleted.",
  },
  {
    question: "Do you offer nonprofit discounts?",
    answer: "Our pricing is already designed with nonprofits in mind. However, we offer additional discounts for organizations with budgets under $500K. Contact us to learn more.",
  },
  {
    question: "Is my data secure?",
    answer: "Yes. All data is encrypted at rest and in transit. We never train AI models on your data. We're SOC 2 Type II compliant and conduct regular security audits.",
  },
];

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "annual">("annual");

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold">Brightway</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <Badge variant="outline" className="mb-4">Pricing</Badge>
        <h1 className="text-4xl md:text-5xl font-display font-bold mb-4">
          Simple, transparent pricing
        </h1>
        <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
          Start free, upgrade when you need more. All plans include a 14-day trial.
        </p>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod("monthly")}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors",
              billingPeriod === "monthly"
                ? "bg-brand text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod("annual")}
            className={cn(
              "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
              billingPeriod === "annual"
                ? "bg-brand text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
          >
            Annual
            <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
              Save 20%
            </Badge>
          </button>
        </div>
      </section>

      {/* Plans */}
      <section className="px-6 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={cn(
                  "relative rounded-2xl border p-8",
                  plan.popular
                    ? "border-brand bg-brand/5 shadow-lg"
                    : "border-border bg-surface"
                )}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    Most Popular
                  </Badge>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
                  <p className="text-sm text-text-secondary">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold">
                      ${plan.price[billingPeriod]}
                    </span>
                    <span className="text-text-secondary">/month</span>
                  </div>
                  {billingPeriod === "annual" && (
                    <p className="text-sm text-text-tertiary mt-1">
                      Billed annually (${plan.price.annual * 12}/year)
                    </p>
                  )}
                </div>

                <Link href={plan.cta === "Contact Sales" ? "/contact" : "/signup"}>
                  <Button
                    className="w-full mb-6"
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>

                <div className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                  {plan.limitations.map((limitation, i) => (
                    <div key={i} className="flex items-start gap-3 opacity-50">
                      <span className="h-5 w-5 flex items-center justify-center flex-shrink-0 mt-0.5">
                        —
                      </span>
                      <span className="text-sm">{limitation}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Feature comparison */}
      <section className="py-20 px-6 bg-surface-subtle">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Compare plans
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 pr-4 font-medium">Feature</th>
                  <th className="text-center py-4 px-4 font-medium">Starter</th>
                  <th className="text-center py-4 px-4 font-medium">Professional</th>
                  <th className="text-center py-4 px-4 font-medium">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { feature: "Proposals per month", starter: "3", pro: "15", enterprise: "Unlimited" },
                  { feature: "Team members", starter: "1", pro: "5", enterprise: "Unlimited" },
                  { feature: "Document storage", starter: "5 GB", pro: "25 GB", enterprise: "100 GB" },
                  { feature: "AI draft generation", starter: true, pro: true, enterprise: true },
                  { feature: "RFP parsing", starter: "Basic", pro: "Advanced", enterprise: "Advanced" },
                  { feature: "Inline AI copilot", starter: false, pro: true, enterprise: true },
                  { feature: "Grant discovery", starter: false, pro: "Grants.gov", enterprise: "All sources" },
                  { feature: "Match scoring", starter: false, pro: true, enterprise: true },
                  { feature: "Weekly grant digest", starter: false, pro: true, enterprise: true },
                  { feature: "Custom integrations", starter: false, pro: false, enterprise: true },
                  { feature: "Priority support", starter: false, pro: true, enterprise: true },
                  { feature: "Dedicated account manager", starter: false, pro: false, enterprise: true },
                ].map((row, i) => (
                  <tr key={i}>
                    <td className="py-4 pr-4 text-sm">{row.feature}</td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.starter === "boolean" ? (
                        row.starter ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )
                      ) : (
                        row.starter
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.pro === "boolean" ? (
                        row.pro ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )
                      ) : (
                        row.pro
                      )}
                    </td>
                    <td className="py-4 px-4 text-center text-sm">
                      {typeof row.enterprise === "boolean" ? (
                        row.enterprise ? (
                          <Check className="h-5 w-5 text-green-600 mx-auto" />
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )
                      ) : (
                        row.enterprise
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Built for grant-writing teams
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Users,
                title: "Small Nonprofits",
                description: "Just getting started with grants? Starter plan gives you everything you need to write professional proposals.",
              },
              {
                icon: Building2,
                title: "Growing Organizations",
                description: "Applying to multiple grants per month? Professional plan scales with your team and unlocks grant discovery.",
              },
              {
                icon: Zap,
                title: "Large Institutions",
                description: "High-volume grant programs need Enterprise. Unlimited proposals, custom integrations, dedicated support.",
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="h-14 w-14 rounded-xl bg-brand-light flex items-center justify-center mx-auto mb-4">
                  <item.icon className="h-7 w-7 text-brand" />
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-text-secondary">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-6 bg-surface-subtle">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">
            Frequently asked questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <div key={i} className="bg-surface rounded-xl p-6 border border-border">
                <h3 className="font-semibold mb-2">{faq.question}</h3>
                <p className="text-sm text-text-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-display font-bold mb-4">
            Ready to write better grants?
          </h2>
          <p className="text-text-secondary mb-8">
            Start your 14-day free trial. No credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-8">
              Start Free Trial
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="font-display font-bold">Brightway Grants</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <Link href="/" className="hover:text-text-primary transition-colors">
                Home
              </Link>
              <Link href="/pricing" className="hover:text-text-primary transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="hover:text-text-primary transition-colors">
                Log In
              </Link>
            </div>
            <p className="text-sm text-text-tertiary">
              © {new Date().getFullYear()} Brightway AI
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
