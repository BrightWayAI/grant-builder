import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileText, Sparkles, Upload, Download } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Brightway Grants</div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Log In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>
      </header>

      <main className="container mx-auto px-4 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Upload an RFP.<br />
            Get a draft proposal.<br />
            <span className="text-primary">In minutes, not days.</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            AI-powered grant proposal generation for small nonprofit development teams.
            Write compelling proposals in your organization&apos;s voice.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="text-lg px-8">
                See How It Works
              </Button>
            </Link>
          </div>
        </div>

        <section id="features" className="mt-24 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <FeatureCard
            icon={<Upload className="h-8 w-8" />}
            title="Knowledge Base"
            description="Upload your past proposals, annual reports, and impact data. We learn your voice."
          />
          <FeatureCard
            icon={<FileText className="h-8 w-8" />}
            title="RFP Parser"
            description="Upload any RFP and we extract requirements, deadlines, and section limits automatically."
          />
          <FeatureCard
            icon={<Sparkles className="h-8 w-8" />}
            title="AI Draft Generation"
            description="Generate complete proposal drafts that match RFP requirements using your organization's content."
          />
          <FeatureCard
            icon={<Download className="h-8 w-8" />}
            title="Export Ready"
            description="Export polished proposals to DOCX or PDF, formatted and ready for submission."
          />
        </section>

        <section className="mt-24 text-center">
          <h2 className="text-3xl font-bold mb-4">Built for Small Nonprofit Teams</h2>
          <p className="text-gray-600 max-w-2xl mx-auto mb-8">
            We focus on what matters: proposal quality and generation speed.
            Keep using your existing tools for tracking and management.
          </p>
          <div className="flex gap-8 justify-center text-sm text-gray-500">
            <div>
              <div className="text-4xl font-bold text-primary">50%</div>
              <div>Less time per proposal</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">10min</div>
              <div>First draft ready</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary">100%</div>
              <div>Your voice, your data</div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-4 py-8 mt-16 border-t">
        <div className="flex justify-between items-center text-sm text-gray-500">
          <div>Brightway Grants</div>
          <div>Built for nonprofits, by people who understand grants.</div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg border bg-white shadow-sm">
      <div className="text-primary mb-4">{icon}</div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
