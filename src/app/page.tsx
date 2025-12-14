"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/primitives/button";
import { Badge } from "@/components/primitives/badge";
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Download, 
  Check,
  ArrowRight,
  Brain,
  Shield,
  ChevronDown,
  Search,
  PenTool,
  Clock,
  Target,
  Zap,
  FolderOpen,
  Database,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Hook to set up global scroll observer
function useScrollAnimations() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -50px 0px" }
    );

    // Observe all elements with scroll-animate class
    document.querySelectorAll(".scroll-animate").forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
}

// Typewriter effect for hero
function TypewriterText({ texts, className }: { texts: string[]; className?: string }) {
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFullText = texts[currentTextIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayedText.length < currentFullText.length) {
          setDisplayedText(currentFullText.slice(0, displayedText.length + 1));
        } else {
          setTimeout(() => setIsDeleting(true), 2000);
        }
      } else {
        if (displayedText.length > 0) {
          setDisplayedText(displayedText.slice(0, -1));
        } else {
          setIsDeleting(false);
          setCurrentTextIndex((prev) => (prev + 1) % texts.length);
        }
      }
    }, isDeleting ? 30 : 80);

    return () => clearTimeout(timeout);
  }, [displayedText, isDeleting, currentTextIndex, texts]);

  return (
    <span className={className}>
      {displayedText}
      <span className="animate-pulse">|</span>
    </span>
  );
}

// Animated counter
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);
          const duration = 2000;
          const startTime = performance.now();
          
          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOut = 1 - Math.pow(1 - progress, 3);
            setCount(Math.floor(easeOut * target));
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [target, hasAnimated]);

  return (
    <div ref={ref} className="text-5xl font-bold font-display text-brand">
      {count}{suffix}
    </div>
  );
}

// FAQ Accordion
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="border-b border-border">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-6 flex items-center justify-between text-left"
      >
        <span className="font-medium text-lg">{question}</span>
        <ChevronDown className={cn(
          "h-5 w-5 text-text-secondary transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>
      <div className={cn(
        "overflow-hidden transition-all duration-300",
        isOpen ? "max-h-96 pb-6" : "max-h-0"
      )}>
        <p className="text-text-secondary leading-relaxed">{answer}</p>
      </div>
    </div>
  );
}

// Browser window mockup wrapper
function BrowserMockup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-white shadow-2xl overflow-hidden", className)}>
      <div className="flex items-center gap-2 px-4 py-2.5 bg-surface-secondary border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-surface rounded-md px-3 py-1 text-xs text-text-tertiary text-center max-w-[200px] mx-auto">
            app.brightwayai.com
          </div>
        </div>
      </div>
      <div className="bg-surface-secondary">
        {children}
      </div>
    </div>
  );
}

// How It Works - Simple 4-step section (not sticky, just visible)
function HowItWorks() {
  const steps = [
    {
      step: 1,
      title: "Upload your RFP",
      description: "Drop in any grant announcement, RFP, or NOFO. Our AI extracts requirements, deadlines, and sections.",
      icon: Upload,
    },
    {
      step: 2,
      title: "AI writes your draft",
      description: "We generate each section using your knowledge base, in your organization's authentic voice.",
      icon: Sparkles,
    },
    {
      step: 3,
      title: "Review & refine",
      description: "Edit inline with our AI copilot. Expand, strengthen, or adjust any section with one click.",
      icon: PenTool,
    },
    {
      step: 4,
      title: "Export & submit",
      description: "Download as a polished DOCX, ready for submission. All formatting preserved.",
      icon: Download,
    },
  ];

  return (
    <section className="py-20 px-6 bg-surface-subtle">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12 scroll-animate float-up">
          <Badge variant="outline" className="mb-4">How It Works</Badge>
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-3">
            From RFP to draft in four steps
          </h2>
          <p className="text-text-secondary text-lg">
            No prompt engineering. No copy-pasting. Just upload and generate.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div 
                key={index} 
                className={cn(
                  "relative p-6 rounded-xl bg-surface border border-border hover:border-brand/30 hover:shadow-lg transition-all group scroll-animate float-up",
                  index === 1 && "delay-100",
                  index === 2 && "delay-200",
                  index === 3 && "delay-300"
                )}
              >
                {/* Step number */}
                <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shadow-lg">
                  {step.step}
                </div>
                
                {/* Icon */}
                <div className="h-12 w-12 rounded-xl bg-brand-light flex items-center justify-center mb-4 group-hover:bg-brand transition-colors">
                  <Icon className="h-6 w-6 text-brand group-hover:text-white transition-colors" />
                </div>
                
                <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Feature section with mockup - alternating layout like Spiral
function FeatureSection({ 
  title, 
  description, 
  bullets,
  mockup, 
  reverse = false,
  badge,
}: { 
  title: string;
  description: string;
  bullets: string[];
  mockup: ReactNode;
  reverse?: boolean;
  badge?: string;
}) {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className={cn(
          "flex flex-col gap-12 items-center",
          reverse ? "lg:flex-row-reverse" : "lg:flex-row"
        )}>
          {/* Text content */}
          <div className={cn(
            "w-full lg:w-1/2 scroll-animate",
            reverse ? "float-right" : "float-left"
          )}>
            {badge && (
              <Badge variant="outline" className="mb-4">{badge}</Badge>
            )}
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
              {title}
            </h2>
            <p className="text-text-secondary text-lg mb-6">
              {description}
            </p>
            <ul className="space-y-3">
              {bullets.map((bullet, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-brand/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="h-4 w-4 text-brand" />
                  </div>
                  <span className="text-text-primary">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Mockup */}
          <div className={cn(
            "w-full lg:w-1/2 scroll-animate delay-200",
            reverse ? "float-left" : "float-right"
          )}>
            <div className="relative">
              <BrowserMockup>
                {mockup}
              </BrowserMockup>
              <div className="absolute -z-10 inset-0 -m-4 bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-2xl blur-2xl opacity-40" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Knowledge Base Mockup
function KnowledgeBaseMockup() {
  return (
    <div className="p-6 bg-surface">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
          <Database className="h-5 w-5 text-brand" />
        </div>
        <div>
          <h4 className="font-semibold">Knowledge Base</h4>
          <p className="text-xs text-text-tertiary">12 documents indexed</p>
        </div>
      </div>
      
      <div className="space-y-3">
        {[
          { name: "2024 Annual Report.pdf", type: "PDF", pages: 24 },
          { name: "Previous NEA Proposal.docx", type: "DOCX", pages: 18 },
          { name: "Impact Data 2023.xlsx", type: "Excel", pages: 5 },
        ].map((doc, i) => (
          <div key={i} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
            <div className="h-10 w-10 rounded bg-brand/10 flex items-center justify-center">
              <FileText className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{doc.name}</p>
              <p className="text-xs text-text-tertiary">{doc.type} · {doc.pages} pages</p>
            </div>
            <Check className="h-5 w-5 text-green-500" />
          </div>
        ))}
      </div>
      
      <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-sm text-green-800 font-medium">✓ All documents indexed and ready</p>
      </div>
    </div>
  );
}

// Grant Discovery Mockup
function GrantDiscoveryMockup() {
  return (
    <div className="p-6 bg-surface">
      <div className="flex items-center gap-2 mb-4">
        <Search className="h-5 w-5 text-text-tertiary" />
        <input 
          type="text" 
          placeholder="Search grants..."
          className="flex-1 bg-surface-secondary rounded-lg px-3 py-2 text-sm"
          defaultValue="arts education nonprofit"
          readOnly
        />
      </div>
      
      <div className="space-y-3">
        {[
          { title: "NEA Grants for Arts Projects", amount: "$10K-$100K", match: 94 },
          { title: "National Arts Education Fund", amount: "$25K-$150K", match: 87 },
          { title: "Community Arts Access Grant", amount: "$5K-$50K", match: 82 },
        ].map((grant, i) => (
          <div key={i} className="p-4 bg-surface-secondary rounded-lg border border-transparent hover:border-brand/30 transition-colors">
            <div className="flex items-start justify-between gap-3 mb-2">
              <h4 className="font-medium text-sm">{grant.title}</h4>
              <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                {grant.match}% match
              </span>
            </div>
            <p className="text-xs text-text-secondary">{grant.amount} · Federal · Due in 45 days</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// AI Generation Mockup
function AIGenerationMockup() {
  return (
    <div className="p-6 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold">Statement of Need</h4>
          <p className="text-xs text-text-tertiary">Section 1 of 8</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 rounded-full">
          <Sparkles className="h-4 w-4 text-brand animate-pulse" />
          <span className="text-sm font-medium text-brand">Writing...</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
          <div className="h-full w-[48%] bg-brand rounded-full transition-all duration-1000" />
        </div>
        <span className="text-xs text-text-secondary">487 / 1000</span>
      </div>
      
      <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed space-y-3">
        <p>
          The Springfield Arts Council has served our community for over 25 years, 
          reaching <span className="bg-yellow-100 px-1 rounded">15,000 residents annually</span> through free public programs.
        </p>
        <p>
          Our recent community needs assessment revealed that 67% of low-income 
          families have never attended a professional arts performance
          <span className="inline-block w-2 h-4 bg-brand ml-1 animate-pulse" />
        </p>
      </div>
      
      <p className="text-xs text-text-tertiary mt-3 flex items-center gap-1">
        <Database className="h-3 w-3" />
        Using data from: 2024 Annual Report, Impact Survey
      </p>
    </div>
  );
}

// Inline Copilot Mockup
function CopilotMockup() {
  return (
    <div className="p-6 bg-surface">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Project Description</h4>
        <span className="px-2 py-1 bg-amber-100 text-amber-800 text-xs font-medium rounded">
          1,847 / 2,000 words
        </span>
      </div>
      
      <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed mb-4">
        <p className="mb-3">
          Our summer youth arts program will expand to serve 200 additional participants.
        </p>
        <p>
          <span className="bg-brand/20 text-brand px-1 rounded border border-brand/30">
            The program includes weekly workshops and mentorship sessions.
          </span>
        </p>
      </div>
      
      <div className="bg-white border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-7 w-7 rounded-full bg-brand flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-sm">AI Copilot</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {["✨ Expand", "Add statistics", "Strengthen", "Shorten", "Make formal"].map((action, i) => (
            <button key={i} className="px-3 py-1.5 bg-surface-secondary hover:bg-brand hover:text-white rounded-full text-xs font-medium transition-colors">
              {action}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Export Mockup
function ExportMockup() {
  return (
    <div className="p-6 bg-surface">
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h4 className="text-xl font-bold text-green-900">Ready to Submit!</h4>
        <p className="text-sm text-green-700">All 8 sections complete</p>
      </div>
      
      <div className="bg-surface-secondary rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-brand" />
          </div>
          <div className="flex-1">
            <p className="font-medium">NEA_Proposal_Final.docx</p>
            <p className="text-xs text-text-tertiary">4,823 words · 12 pages</p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
        {["All sections ✓", "Word limits ✓", "Formatting ✓", "Citations ✓"].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-green-700">
            <span>{item}</span>
          </div>
        ))}
      </div>
      
      <Button className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download DOCX
      </Button>
    </div>
  );
}

// Why Beacon section
function WhyBeacon() {
  const benefits = [
    {
      icon: Clock,
      stat: "10x",
      label: "faster first drafts",
      description: "What takes days now takes minutes",
    },
    {
      icon: Target,
      stat: "100%",
      label: "your voice",
      description: "AI trained on your actual documents",
    },
    {
      icon: Zap,
      stat: "Zero",
      label: "hallucinations",
      description: "Every stat grounded in your data",
    },
  ];

  return (
    <section className="py-24 px-6 bg-brand text-white">
      <div className="max-w-5xl mx-auto text-center">
        <div className="scroll-animate float-up">
          <Badge variant="outline" className="mb-4 border-white/30 text-white">Why Beacon</Badge>
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-16">
            Stop starting from scratch
          </h2>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div 
                key={index} 
                className={cn(
                  "text-center scroll-animate float-up",
                  index === 1 && "delay-100",
                  index === 2 && "delay-200"
                )}
              >
                <div className="h-16 w-16 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <Icon className="h-8 w-8" />
                </div>
                <div className="text-5xl font-bold font-display mb-2">{benefit.stat}</div>
                <div className="text-lg font-medium mb-2">{benefit.label}</div>
                <p className="text-white/70">{benefit.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  // Set up scroll animations
  useScrollAnimations();

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const faqs = [
    {
      question: "How is this different from ChatGPT?",
      answer: "ChatGPT is a general-purpose tool that requires extensive prompting to get good results. Beacon is purpose-built for grant writing. It understands RFP structures, knows what funders look for, and uses YOUR organization's data to write in YOUR voice. No prompt engineering required—just upload and generate.",
    },
    {
      question: "How does the knowledge base work?",
      answer: "Upload your past proposals, annual reports, impact data, and organizational documents. Our AI creates embeddings of your content and retrieves the most relevant information when generating each section. This means your proposals include real statistics, actual program descriptions, and authentic organizational voice—not generic filler.",
    },
    {
      question: "What types of grants does this work for?",
      answer: "Beacon works with federal grants (via Grants.gov integration), foundation grants, corporate giving, and state/local government funding. The RFP parser handles various formats including NOFOs, LOIs, and full applications. If it has sections to write, Beacon can help.",
    },
    {
      question: "Can I edit the generated content?",
      answer: "Absolutely. Our inline editor lets you refine every section with AI assistance. Select any text and use the copilot to expand, condense, strengthen, or adjust tone. You maintain full control—the AI is your writing partner, not a replacement.",
    },
    {
      question: "Is my data secure?",
      answer: "Yes. Your documents are encrypted at rest and in transit. We never train our models on your data. Your knowledge base is completely private to your organization. We're built for nonprofits who handle sensitive beneficiary information—security is foundational.",
    },
  ];

  const principles = [
    { text: "We won't make up statistics or data", negative: true },
    { text: "We will use your real program data", negative: false },
    { text: "We won't use generic AI filler language", negative: true },
    { text: "We will match your organization's voice", negative: false },
    { text: "We won't exceed your word limits", negative: true },
    { text: "We will cite your actual impact numbers", negative: false },
  ];

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrollY > 50 ? "bg-surface/95 backdrop-blur-sm border-b border-border" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/beacon-logo.png" alt="Beacon" width={32} height={32} />
              <div className="flex flex-col">
                <span className="text-xl font-display font-bold leading-tight">Beacon</span>
                <span className="text-[10px] text-text-tertiary leading-tight flex items-center gap-1">
                  by <Image src="/brightway-logo.png" alt="BrightWay" width={12} height={12} className="inline" /> BrightWay
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="#pricing" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
                Pricing
              </a>
              <Link href="/login">
                <Button variant="ghost">Log In</Button>
              </Link>
              <Link href="/signup">
                <Button>Get Started <ArrowRight className="h-4 w-4 ml-1" /></Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <Badge variant="outline" className="mb-6 px-4 py-1.5">
            <Sparkles className="h-3 w-3 mr-2" />
            AI-Powered Grant Writing
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            Draft grant proposals<br />
            <span className="text-brand">
              <TypewriterText 
                texts={[
                  "in minutes, not weeks",
                  "in your authentic voice", 
                  "grounded in your data",
                  "that win funding",
                  "without the blank page"
                ]} 
              />
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-8">
            Upload an RFP. Get a complete draft. Powered by your organization&apos;s 
            knowledge base, written in your authentic voice.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <Button size="lg" className="text-lg px-8 h-14">
                Start Writing Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
            <Link href="#how-it-works">
              <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                See How It Works
              </Button>
            </Link>
          </div>
          <p className="text-sm text-text-tertiary mt-4">
            No credit card required · 3 free proposals
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 px-6 border-y border-border bg-surface-subtle">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-text-tertiary mb-6 text-sm">
            Built for nonprofit teams who write grants
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { target: 50, suffix: "%", label: "Less time per proposal" },
              { target: 10, suffix: "min", label: "To first draft" },
              { target: 100, suffix: "%", label: "Your voice & data" },
              { target: 920, suffix: "+", label: "Grants discoverable" },
            ].map((stat, index) => (
              <div key={index}>
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                <p className="text-text-secondary text-sm mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Simple grid */}
      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* Feature Sections - Spiral style with alternating layouts */}
      <div className="bg-surface divide-y divide-border">
        <FeatureSection
          badge="Knowledge Base"
          title="Your documents, your voice"
          description="Upload past proposals, annual reports, and impact data. Beacon learns your organization's unique voice and pulls relevant information when writing."
          bullets={[
            "Index PDFs, Word docs, and spreadsheets",
            "AI learns your writing style and terminology",
            "Automatically cite your real statistics and data",
          ]}
          mockup={<KnowledgeBaseMockup />}
        />
        
        <FeatureSection
          badge="Grant Discovery"
          title="Find grants that match"
          description="Search Grants.gov with intelligent filtering. See match scores based on your organization's profile, eligibility, and program areas."
          bullets={[
            "920+ federal grants searchable",
            "Match scoring based on your profile",
            "Save and track interesting opportunities",
          ]}
          mockup={<GrantDiscoveryMockup />}
          reverse
        />
        
        <FeatureSection
          badge="AI Generation"
          title="Drafts grounded in facts"
          description="Every sentence is grounded in your knowledge base. No hallucinations, no generic filler—just your real data in compelling prose."
          bullets={[
            "Section-by-section generation",
            "Real-time word count tracking",
            "Highlights data sources used",
          ]}
          mockup={<AIGenerationMockup />}
        />
        
        <FeatureSection
          badge="Inline Copilot"
          title="Refine with one click"
          description="Select any text and use the AI copilot to expand, strengthen, add data, or adjust tone. Stay within word limits automatically."
          bullets={[
            "Expand or condense sections instantly",
            "Add supporting statistics from your docs",
            "Adjust formality and tone",
          ]}
          mockup={<CopilotMockup />}
          reverse
        />
        
        <FeatureSection
          badge="Export"
          title="Ready to submit"
          description="Download your polished proposal as a professionally formatted Word document. All sections complete, all requirements met."
          bullets={[
            "DOCX export with proper formatting",
            "Automatic section organization",
            "Ready for any submission portal",
          ]}
          mockup={<ExportMockup />}
        />
      </div>

      {/* Why Beacon */}
      <WhyBeacon />

      {/* Principles */}
      <section className="py-24 px-6 bg-surface">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16 scroll-animate float-up">
            <Badge variant="outline" className="mb-4">Our Principles</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              AI that writes with integrity
            </h2>
            <p className="text-text-secondary text-lg">
              Every proposal Beacon generates follows these rules
            </p>
          </div>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {principles.map((principle, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg scroll-animate float-up",
                  principle.negative 
                    ? "bg-red-50 text-red-900" 
                    : "bg-green-50 text-green-900",
                  index >= 2 && "delay-100",
                  index >= 4 && "delay-200"
                )}
              >
                <div className={cn(
                  "p-1 rounded-full flex-shrink-0",
                  principle.negative ? "bg-red-200" : "bg-green-200"
                )}>
                  {principle.negative ? (
                    <span className="block h-4 w-4 text-center leading-4 text-red-600 font-bold">×</span>
                  ) : (
                    <Check className="h-4 w-4 text-green-600" />
                  )}
                </div>
                <span className="font-medium">{principle.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6 bg-surface-subtle">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16 scroll-animate float-up">
            <h2 className="text-4xl font-display font-bold mb-4">
              Simple pricing
            </h2>
            <p className="text-xl text-text-secondary">
              Try your first proposal free. No credit card required.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6 scroll-animate float-up delay-100">
            {/* Individual Plan */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$49</span>
                  <span className="text-text-secondary text-sm">/mo</span>
                </div>
                <h3 className="text-lg font-semibold">Individual</h3>
                <p className="text-sm text-text-tertiary mt-1">For solo grant writers</p>
              </div>
              
              <Link href="/signup">
                <Button className="w-full mb-5" variant="outline">Start Free</Button>
              </Link>
              
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>5 proposals per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>250 MB knowledge base</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>25 documents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Grant discovery</span>
                </li>
              </ul>
            </div>
            
            {/* Teams Plan */}
            <div className="rounded-2xl border-2 border-brand bg-brand/5 p-6 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-brand text-white text-xs font-medium px-3 py-1 rounded-full">
                  Most Popular
                </span>
              </div>
              <div className="mb-5">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$29</span>
                  <span className="text-text-secondary text-sm">/seat/mo</span>
                </div>
                <h3 className="text-lg font-semibold">Teams</h3>
                <p className="text-sm text-text-tertiary mt-1">For growing organizations</p>
              </div>
              
              <Link href="/signup">
                <Button className="w-full mb-5">Start Free</Button>
              </Link>
              
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>15 proposals per seat</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>1 GB shared storage</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>100 documents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Unlimited team members</span>
                </li>
              </ul>
            </div>
            
            {/* Enterprise Plan */}
            <div className="rounded-2xl border border-border bg-surface p-6">
              <div className="mb-5">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">$199</span>
                  <span className="text-text-secondary text-sm">/mo</span>
                </div>
                <h3 className="text-lg font-semibold">Enterprise</h3>
                <p className="text-sm text-text-tertiary mt-1">For high-volume programs</p>
              </div>
              
              <Link href="/signup">
                <Button className="w-full mb-5" variant="outline">Start Free</Button>
              </Link>
              
              <ul className="space-y-2.5 text-sm">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>50 proposals per month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>5 GB knowledge base</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>500 documents</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                  <span>Dedicated support</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-surface">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16 scroll-animate float-up">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-display font-bold">
              Questions & Answers
            </h2>
          </div>
          
          <div className="scroll-animate float-up delay-100">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-surface-subtle">
        <div className="max-w-4xl mx-auto text-center scroll-animate float-up">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
            Write your first proposal free
          </h2>
          <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
            See how Beacon works with your real RFP. No credit card required.
          </p>
          <Link href="/signup">
            <Button size="lg" className="text-lg px-10 h-14">
              Start Writing Free
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <Image src="/beacon-logo.png" alt="Beacon" width={32} height={32} />
              <div className="flex flex-col">
                <span className="font-display font-bold leading-tight">Beacon</span>
                <span className="text-[10px] text-text-tertiary leading-tight flex items-center gap-1">
                  by <Image src="/brightway-logo.png" alt="BrightWay" width={12} height={12} className="inline" /> BrightWay
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-text-secondary">
              <Link href="/login" className="hover:text-text-primary transition-colors">
                Log In
              </Link>
              <Link href="/signup" className="hover:text-text-primary transition-colors">
                Sign Up
              </Link>
            </div>
            <p className="text-sm text-text-tertiary">
              Built for nonprofits, by people who understand grants.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
