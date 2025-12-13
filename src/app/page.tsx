"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
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
  FileCheck,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Scroll-triggered fade in animation
function FadeInOnScroll({ 
  children, 
  className,
  delay = 0,
  direction = "up" 
}: { 
  children: ReactNode; 
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [delay]);

  const directionStyles = {
    up: "translate-y-8",
    down: "-translate-y-8",
    left: "translate-x-8",
    right: "-translate-x-8",
  };

  return (
    <div
      ref={ref}
      className={cn(
        "transition-all duration-700 ease-out",
        isVisible ? "opacity-100 translate-x-0 translate-y-0" : `opacity-0 ${directionStyles[direction]}`,
        className
      )}
    >
      {children}
    </div>
  );
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

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
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

// Screenshot mockup component
function ScreenshotMockup({ 
  children, 
  className 
}: { 
  children: ReactNode; 
  className?: string;
}) {
  return (
    <div className={cn(
      "rounded-xl border border-border bg-surface shadow-2xl overflow-hidden",
      className
    )}>
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-surface-secondary border-b border-border">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-400" />
          <div className="w-3 h-3 rounded-full bg-yellow-400" />
          <div className="w-3 h-3 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 mx-4">
          <div className="bg-surface rounded-md px-3 py-1 text-xs text-text-tertiary text-center">
            app.brightwayai.com
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-1 bg-surface-secondary">
        {children}
      </div>
    </div>
  );
}

// Feature showcase with screenshot
function FeatureShowcase({
  badge,
  title,
  description,
  features,
  screenshot,
  reversed = false,
}: {
  badge: string;
  title: string;
  description: string;
  features: string[];
  screenshot: ReactNode;
  reversed?: boolean;
}) {
  return (
    <div className={cn(
      "grid lg:grid-cols-2 gap-12 lg:gap-20 items-center",
      reversed && "lg:grid-flow-dense"
    )}>
      <FadeInOnScroll 
        direction={reversed ? "right" : "left"}
        className={reversed ? "lg:col-start-2" : ""}
      >
        <Badge variant="outline" className="mb-4">{badge}</Badge>
        <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
          {title}
        </h3>
        <p className="text-lg text-text-secondary mb-6">
          {description}
        </p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="p-1 bg-brand-light rounded-full mt-0.5">
                <Check className="h-4 w-4 text-brand" />
              </div>
              <span className="text-text-secondary">{feature}</span>
            </li>
          ))}
        </ul>
      </FadeInOnScroll>
      
      <FadeInOnScroll 
        direction={reversed ? "left" : "right"} 
        delay={200}
        className={reversed ? "lg:col-start-1 lg:row-start-1" : ""}
      >
        <ScreenshotMockup>
          {screenshot}
        </ScreenshotMockup>
      </FadeInOnScroll>
    </div>
  );
}

export default function Home() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const faqs = [
    {
      question: "How is this different from ChatGPT?",
      answer: "ChatGPT is a general-purpose tool that requires extensive prompting to get good results. Brightway Grants is purpose-built for grant writing. It understands RFP structures, knows what funders look for, and uses YOUR organization's data to write in YOUR voice. No prompt engineering required—just upload and generate.",
    },
    {
      question: "How does the knowledge base work?",
      answer: "Upload your past proposals, annual reports, impact data, and organizational documents. Our AI creates embeddings of your content and retrieves the most relevant information when generating each section. This means your proposals include real statistics, actual program descriptions, and authentic organizational voice—not generic filler.",
    },
    {
      question: "What types of grants does this work for?",
      answer: "Brightway works with federal grants (via Grants.gov integration), foundation grants, corporate giving, and state/local government funding. The RFP parser handles various formats including NOFOs, LOIs, and full applications. If it has sections to write, Brightway can help.",
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

  return (
    <div className="min-h-screen bg-surface overflow-x-hidden">
      {/* Header */}
      <header className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrollY > 50 ? "bg-surface/95 backdrop-blur-sm border-b border-border" : "bg-transparent"
      )}>
        <div className="max-w-7xl mx-auto px-6 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-brand rounded-lg flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-display font-bold">Brightway</span>
            </div>
            <div className="flex items-center gap-4">
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
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <FadeInOnScroll>
            <Badge variant="outline" className="mb-6 px-4 py-1.5">
              <Sparkles className="h-3 w-3 mr-2" />
              AI-Powered Grant Writing
            </Badge>
          </FadeInOnScroll>
          
          <FadeInOnScroll delay={100}>
            <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
              Write winning grants<br />
              <span className="text-brand">
                <TypewriterText 
                  texts={["in minutes", "with your voice", "using your data", "confidently"]} 
                />
              </span>
            </h1>
          </FadeInOnScroll>
          
          <FadeInOnScroll delay={200}>
            <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
              Upload an RFP. Get a complete draft. Powered by your organization&apos;s 
              knowledge base, written in your authentic voice.
            </p>
          </FadeInOnScroll>
          
          <FadeInOnScroll delay={300}>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/signup">
                <Button size="lg" className="text-lg px-8 h-14">
                  Start Writing Free
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              </Link>
              <Link href="#features">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14">
                  See How It Works
                </Button>
              </Link>
            </div>
            <p className="text-sm text-text-tertiary mt-6">
              No credit card required · 3 free proposals
            </p>
          </FadeInOnScroll>
        </div>
      </section>

      {/* Hero Screenshot */}
      <section className="px-6 pb-20">
        <FadeInOnScroll delay={400}>
          <div className="max-w-5xl mx-auto">
            <ScreenshotMockup>
              <div className="bg-surface p-6 min-h-[400px]">
                {/* Dashboard mockup */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-brand-light rounded-lg p-4">
                    <p className="text-sm text-text-secondary">Active Proposals</p>
                    <p className="text-3xl font-bold text-brand">3</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-4">
                    <p className="text-sm text-text-secondary">Documents</p>
                    <p className="text-3xl font-bold">24</p>
                  </div>
                  <div className="bg-surface-secondary rounded-lg p-4">
                    <p className="text-sm text-text-secondary">Matching Grants</p>
                    <p className="text-3xl font-bold">12</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h3 className="font-semibold">Recent Proposals</h3>
                    {["NEA Arts Education Grant", "Ford Foundation Climate", "Robert Wood Johnson Health"].map((name, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
                        <FileText className="h-5 w-5 text-brand" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">{name}</p>
                          <p className="text-xs text-text-tertiary">Draft · Updated 2h ago</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-3">
                    <h3 className="font-semibold">Recommended Grants</h3>
                    {[
                      { name: "Community Arts Grant", match: 92 },
                      { name: "Youth Development Fund", match: 87 },
                      { name: "Environmental Justice", match: 84 },
                    ].map((grant, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-surface-secondary rounded-lg">
                        <div className="h-10 w-10 bg-brand-light rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-brand">{grant.match}%</span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{grant.name}</p>
                          <p className="text-xs text-text-tertiary">Deadline: Mar 15</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScreenshotMockup>
          </div>
        </FadeInOnScroll>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 border-y border-border bg-surface-subtle">
        <div className="max-w-5xl mx-auto">
          <FadeInOnScroll>
            <p className="text-center text-text-tertiary mb-8">
              Built for nonprofit teams who write grants
            </p>
          </FadeInOnScroll>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { target: 50, suffix: "%", label: "Less time per proposal" },
              { target: 10, suffix: "min", label: "To first draft" },
              { target: 100, suffix: "%", label: "Your voice & data" },
              { target: 920, suffix: "+", label: "Grants discoverable" },
            ].map((stat, index) => (
              <FadeInOnScroll key={index} delay={index * 100}>
                <div>
                  <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                  <p className="text-text-secondary mt-2">{stat.label}</p>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* Feature Showcases */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto space-y-32">
          
          {/* Feature 1: Knowledge Base */}
          <FeatureShowcase
            badge="Knowledge Base"
            title="Your organization's brain, always ready"
            description="Upload past proposals, annual reports, impact data, and organizational documents. Our AI learns your voice and pulls the most relevant information when writing."
            features={[
              "Smart document categorization (proposals, reports, financials)",
              "Automatic text extraction from PDF, DOCX, and TXT",
              "Semantic search finds the right context for each section",
              "Your data stays private and is never used for training",
            ]}
            screenshot={
              <div className="bg-surface p-6 min-h-[350px]">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold">Knowledge Base</h3>
                  <Badge>24 documents</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { name: "Past Proposals", count: 8, icon: FileText, color: "text-brand" },
                    { name: "Organization Info", count: 6, icon: Brain, color: "text-purple-500" },
                    { name: "Impact Reports", count: 5, icon: Search, color: "text-green-500" },
                    { name: "Financial Docs", count: 5, icon: Shield, color: "text-orange-500" },
                  ].map((cat, i) => (
                    <div key={i} className="p-4 bg-surface-secondary rounded-lg">
                      <cat.icon className={cn("h-6 w-6 mb-2", cat.color)} />
                      <p className="font-medium text-sm">{cat.name}</p>
                      <p className="text-xs text-text-tertiary">{cat.count} documents</p>
                    </div>
                  ))}
                </div>
                <div className="p-3 bg-brand-light rounded-lg border-2 border-dashed border-brand flex items-center justify-center gap-2">
                  <Upload className="h-5 w-5 text-brand" />
                  <span className="text-sm text-brand font-medium">Drop files to upload</span>
                </div>
              </div>
            }
          />

          {/* Feature 2: Grant Discovery */}
          <FeatureShowcase
            badge="Grant Discovery"
            title="Find grants that match your mission"
            description="Search 900+ federal grants from Grants.gov. Our matching algorithm scores each opportunity based on your organization's profile, program areas, and funding needs."
            features={[
              "Real-time Grants.gov integration",
              "Smart matching based on your org profile",
              "Filter by program area, eligibility, and amount",
              "Save grants to your watchlist for tracking",
            ]}
            reversed
            screenshot={
              <div className="bg-surface p-6 min-h-[350px]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="flex-1 bg-surface-secondary rounded-lg px-4 py-2 flex items-center gap-2">
                    <Search className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm text-text-tertiary">Search grants...</span>
                  </div>
                  <Button size="sm">Search</Button>
                </div>
                <div className="space-y-3">
                  {[
                    { name: "NEA Arts Education Partnership", agency: "NEA", match: 94, amount: "$50K-$150K" },
                    { name: "Community Development Block Grant", agency: "HUD", match: 89, amount: "$100K-$500K" },
                    { name: "Environmental Justice Collaborative", agency: "EPA", match: 85, amount: "$75K-$200K" },
                  ].map((grant, i) => (
                    <div key={i} className="p-4 bg-surface-secondary rounded-lg flex items-center gap-4">
                      <div className="h-12 w-12 bg-brand-light rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg font-bold text-brand">{grant.match}%</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{grant.name}</p>
                        <p className="text-xs text-text-tertiary">{grant.agency} · {grant.amount}</p>
                      </div>
                      <Button size="sm" variant="outline">View</Button>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          {/* Feature 3: RFP Parser */}
          <FeatureShowcase
            badge="Smart RFP Parser"
            title="Upload any RFP, we handle the rest"
            description="Drop in a grant announcement, RFP, or NOFO. Our AI extracts all requirements, deadlines, sections, and word limits automatically—no manual data entry."
            features={[
              "Supports PDF, DOCX, and text formats",
              "Extracts deadlines, amounts, and eligibility",
              "Identifies all narrative sections automatically",
              "Detects word and character limits per section",
            ]}
            screenshot={
              <div className="bg-surface p-6 min-h-[350px]">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="h-6 w-6 text-brand" />
                  <div>
                    <p className="font-medium">NEA-Arts-Grant-2025.pdf</p>
                    <p className="text-xs text-status-success">Parsed successfully</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="p-3 bg-surface-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">Deadline</p>
                    <p className="font-medium text-sm">Mar 15, 2025</p>
                  </div>
                  <div className="p-3 bg-surface-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">Award Range</p>
                    <p className="font-medium text-sm">$10K-$100K</p>
                  </div>
                  <div className="p-3 bg-surface-secondary rounded-lg">
                    <p className="text-xs text-text-tertiary">Sections</p>
                    <p className="font-medium text-sm">8 identified</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium mb-2">Sections Detected:</p>
                  {["Executive Summary (500 words)", "Statement of Need (1000 words)", "Project Description (2000 words)", "Evaluation Plan (750 words)"].map((section, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-status-success" />
                      <span>{section}</span>
                    </div>
                  ))}
                </div>
              </div>
            }
          />

          {/* Feature 4: AI Generation */}
          <FeatureShowcase
            badge="AI Generation"
            title="First drafts in minutes, not days"
            description="Generate complete proposal sections using your knowledge base. Each draft is grounded in your real data, written in your voice, and respects word limits."
            features={[
              "Section-by-section generation with streaming",
              "Pulls relevant context from your knowledge base",
              "Respects word and character limits",
              "Flags missing information with placeholders",
            ]}
            reversed
            screenshot={
              <div className="bg-surface p-6 min-h-[350px]">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-medium">Statement of Need</p>
                    <p className="text-xs text-text-tertiary">487 / 1000 words</p>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" /> Generating...
                  </Badge>
                </div>
                <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed">
                  <p>
                    The Springfield Arts Council has served our community for over 25 years, 
                    reaching 15,000 residents annually through free public programs. Despite 
                    this reach, significant gaps remain in arts access for underserved 
                    populations.
                  </p>
                  <p className="mt-3">
                    Our recent community needs assessment revealed that 67% of low-income 
                    families have never attended a professional arts performance, citing cost 
                    and transportation as primary barriers. This represents over 3,200 families 
                    in our service area who lack meaningful connection to cultural resources...
                  </p>
                  <span className="inline-block mt-2 animate-pulse text-brand">▊</span>
                </div>
              </div>
            }
          />

          {/* Feature 5: Inline Editor */}
          <FeatureShowcase
            badge="Inline Copilot"
            title="Refine with AI assistance"
            description="Select any text and use the copilot to expand, condense, strengthen, or adjust tone. Get suggestions grounded in your knowledge base data."
            features={[
              "Expand sections with more detail and examples",
              "Condense to meet strict word limits",
              "Strengthen arguments with supporting data",
              "Adjust tone for different funders",
            ]}
            screenshot={
              <div className="bg-surface p-6 min-h-[350px]">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-medium">Project Description</p>
                  <p className="text-xs text-text-tertiary">1,847 / 2,000 words</p>
                </div>
                <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed">
                  <p>
                    Our summer youth program will expand to serve 200 additional participants 
                    through partnerships with three new community centers. 
                    <span className="bg-brand/20 text-brand px-1 rounded mx-1">
                      The program includes weekly workshops, mentorship sessions, and a 
                      culminating showcase event.
                    </span>
                  </p>
                  <div className="mt-4 p-3 bg-white rounded-lg border shadow-lg">
                    <p className="text-xs font-medium mb-2">AI Copilot</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="cursor-pointer hover:bg-brand-light text-xs">
                        <Sparkles className="h-3 w-3 mr-1" /> Expand with details
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-brand-light text-xs">
                        Add impact data
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-brand-light text-xs">
                        Strengthen
                      </Badge>
                      <Badge variant="outline" className="cursor-pointer hover:bg-brand-light text-xs">
                        Make concise
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            }
          />

        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-6 bg-surface-subtle">
        <div className="max-w-4xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">Our Principles</Badge>
              <h2 className="text-4xl font-display font-bold mb-4">
                AI that writes with integrity
              </h2>
              <p className="text-text-secondary text-lg">
                Every proposal Brightway generates follows these rules
              </p>
            </div>
          </FadeInOnScroll>
          
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              "We won't make up statistics or data",
              "We won't use generic AI filler language", 
              "We won't exceed your word limits",
              "We will use your real program data",
              "We will match your organization's voice",
              "We will cite your actual impact numbers",
              "We will flag when information is missing",
              "We will let you review everything before export",
            ].map((principle, index) => (
              <FadeInOnScroll key={index} delay={index * 50}>
                <div 
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg",
                    principle.startsWith("We won't") 
                      ? "bg-red-50 text-red-900" 
                      : "bg-green-50 text-green-900"
                  )}
                >
                  <div className={cn(
                    "p-1 rounded-full flex-shrink-0",
                    principle.startsWith("We won't") ? "bg-red-200" : "bg-green-200"
                  )}>
                    {principle.startsWith("We won't") ? (
                      <span className="block h-4 w-4 text-center leading-4 text-red-600 font-bold">×</span>
                    ) : (
                      <Check className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <span className="font-medium">{principle}</span>
                </div>
              </FadeInOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <FadeInOnScroll>
            <div className="text-center mb-16">
              <Badge variant="outline" className="mb-4">FAQ</Badge>
              <h2 className="text-4xl font-display font-bold">
                Questions & Answers
              </h2>
            </div>
          </FadeInOnScroll>
          
          <FadeInOnScroll delay={200}>
            <div>
              {faqs.map((faq, index) => (
                <FAQItem key={index} question={faq.question} answer={faq.answer} />
              ))}
            </div>
          </FadeInOnScroll>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-surface-subtle">
        <FadeInOnScroll>
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-6">
              Stop spending weeks on proposals
            </h2>
            <p className="text-xl text-text-secondary mb-10 max-w-2xl mx-auto">
              Join nonprofit teams who are writing better grants in less time. 
              Start free, no credit card required.
            </p>
            <Link href="/signup">
              <Button size="lg" className="text-lg px-10 h-14">
                Start Writing Free
                <ArrowRight className="h-5 w-5 ml-2" />
              </Button>
            </Link>
          </div>
        </FadeInOnScroll>
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
