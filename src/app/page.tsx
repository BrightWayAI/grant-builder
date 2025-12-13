"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/primitives/button";
import { Card, CardContent } from "@/components/primitives/card";
import { Badge } from "@/components/primitives/badge";
import { 
  FileText, 
  Sparkles, 
  Upload, 
  Download, 
  ChevronRight,
  Check,
  ArrowRight,
  Building2,
  Target,
  Brain,
  Zap,
  Clock,
  Shield,
  ChevronDown,
  Search,
  FileCheck,
  PenTool,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
          let start = 0;
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

// Interactive Feature Demo
function FeatureDemo() {
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      title: "Upload your RFP",
      description: "Drop in any grant announcement, RFP, or NOFO. Our AI extracts requirements, deadlines, and sections automatically.",
      icon: Upload,
      visual: (
        <div className="bg-surface-secondary rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-dashed border-brand animate-pulse">
            <FileText className="h-8 w-8 text-brand" />
            <div>
              <p className="font-medium">NEA-Arts-Grant-2025.pdf</p>
              <p className="text-sm text-text-secondary">Analyzing requirements...</p>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-status-success" />
              <span>Deadline: March 15, 2025</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-status-success" />
              <span>8 sections identified</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-status-success" />
              <span>Award: $10,000 - $100,000</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "AI generates your draft",
      description: "Using your knowledge base, we write each section in your organization's voice with real data from your past work.",
      icon: Sparkles,
      visual: (
        <div className="bg-surface-secondary rounded-xl p-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-brand animate-pulse" />
              <span className="text-sm font-medium">Generating Statement of Need...</span>
            </div>
            <div className="bg-white rounded-lg p-4 space-y-2 text-sm">
              <p className="text-text-primary leading-relaxed">
                The Springfield Arts Council has served our community for over 25 years, 
                reaching 15,000 residents annually through free public programs. 
                Our recent impact study shows that 89% of participants report increased 
                engagement with local arts...
              </p>
              <span className="inline-block animate-pulse">▊</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Review & refine",
      description: "Edit with our inline AI copilot. Expand sections, strengthen arguments, or adjust tone—all while staying within word limits.",
      icon: PenTool,
      visual: (
        <div className="bg-surface-secondary rounded-xl p-6">
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Project Description</span>
              <span className="text-text-tertiary">487 / 500 words</span>
            </div>
            <div className="text-sm leading-relaxed">
              <span className="bg-brand-light text-brand px-1 rounded">Our summer youth program</span>
              {" "}will expand to serve 200 additional participants through partnerships 
              with three new community centers...
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="cursor-pointer hover:bg-brand-light">
                <Sparkles className="h-3 w-3 mr-1" /> Expand
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-brand-light">
                Strengthen
              </Badge>
              <Badge variant="outline" className="cursor-pointer hover:bg-brand-light">
                Add data
              </Badge>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Export & submit",
      description: "Download your polished proposal as DOCX, ready for submission. All formatting preserved, all requirements met.",
      icon: Download,
      visual: (
        <div className="bg-surface-secondary rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
            <FileCheck className="h-10 w-10 text-status-success" />
            <div className="flex-1">
              <p className="font-medium">NEA_Arts_Proposal_Final.docx</p>
              <p className="text-sm text-status-success">Ready for submission</p>
            </div>
            <Button size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-status-success" />
              <span>All sections complete</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-status-success" />
              <span>Word limits met</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-status-success" />
              <span>Formatting applied</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-status-success" />
              <span>Citations included</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grid lg:grid-cols-2 gap-12 items-center">
      <div className="space-y-4">
        {steps.map((step, index) => (
          <button
            key={index}
            onClick={() => setActiveStep(index)}
            className={cn(
              "w-full text-left p-4 rounded-xl transition-all duration-300",
              activeStep === index 
                ? "bg-brand-light border-2 border-brand" 
                : "bg-surface-subtle hover:bg-surface-secondary border-2 border-transparent"
            )}
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2 rounded-lg",
                activeStep === index ? "bg-brand text-white" : "bg-surface-secondary text-text-secondary"
              )}>
                <step.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-sm font-medium",
                    activeStep === index ? "text-brand" : "text-text-tertiary"
                  )}>
                    Step {index + 1}
                  </span>
                </div>
                <h3 className="font-semibold mt-1">{step.title}</h3>
                {activeStep === index && (
                  <p className="text-sm text-text-secondary mt-2">{step.description}</p>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className="relative">
        <div className="aspect-[4/3] relative">
          {steps[activeStep].visual}
        </div>
      </div>
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
    <div className="min-h-screen bg-surface">
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
          <Badge variant="outline" className="mb-6 px-4 py-1.5">
            <Sparkles className="h-3 w-3 mr-2" />
            AI-Powered Grant Writing
          </Badge>
          
          <h1 className="text-5xl md:text-7xl font-display font-bold leading-tight mb-6">
            Write winning grants<br />
            <span className="text-brand">
              <TypewriterText 
                texts={["in minutes", "with your voice", "using your data", "confidently"]} 
              />
            </span>
          </h1>
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
            Upload an RFP. Get a complete draft. Powered by your organization's 
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
          
          <p className="text-sm text-text-tertiary mt-6">
            No credit card required · 3 free proposals
          </p>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-16 px-6 border-y border-border bg-surface-subtle">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-text-tertiary mb-8">
            Built for nonprofit teams who write grants
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <AnimatedCounter target={50} suffix="%" />
              <p className="text-text-secondary mt-2">Less time per proposal</p>
            </div>
            <div>
              <AnimatedCounter target={10} suffix="min" />
              <p className="text-text-secondary mt-2">To first draft</p>
            </div>
            <div>
              <AnimatedCounter target={100} suffix="%" />
              <p className="text-text-secondary mt-2">Your voice & data</p>
            </div>
            <div>
              <AnimatedCounter target={920} suffix="+" />
              <p className="text-text-secondary mt-2">Grants discoverable</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              From RFP to draft in four steps
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              No prompt engineering. No copy-pasting. Just upload your RFP and 
              let your knowledge base do the heavy lifting.
            </p>
          </div>
          
          <FeatureDemo />
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 px-6 bg-surface-subtle">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              Everything you need to write better grants
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: "Knowledge Base",
                description: "Upload past proposals, reports, and org docs. Our AI learns your voice and pulls relevant data automatically.",
              },
              {
                icon: Search,
                title: "Grant Discovery",
                description: "Find matching federal grants from Grants.gov. Filter by program area, eligibility, and funding amount.",
              },
              {
                icon: FileText,
                title: "Smart RFP Parser",
                description: "Upload any RFP format. We extract sections, requirements, deadlines, and word limits automatically.",
              },
              {
                icon: Sparkles,
                title: "AI Generation",
                description: "Generate complete drafts section by section. Each grounded in your data, written in your voice.",
              },
              {
                icon: PenTool,
                title: "Inline Copilot",
                description: "Select any text and refine with AI. Expand, condense, strengthen, or add supporting data.",
              },
              {
                icon: Shield,
                title: "Secure & Private",
                description: "Your data is encrypted and never used for training. Built for organizations handling sensitive info.",
              },
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="p-3 bg-brand-light rounded-xl w-fit mb-4 group-hover:bg-brand group-hover:text-white transition-colors">
                    <feature.icon className="h-6 w-6 text-brand group-hover:text-white" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">Our Principles</Badge>
            <h2 className="text-4xl font-display font-bold mb-4">
              AI that writes with integrity
            </h2>
            <p className="text-text-secondary text-lg">
              Every proposal Brightway generates follows these rules
            </p>
          </div>
          
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
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg",
                  principle.startsWith("We won't") 
                    ? "bg-red-50 text-red-900" 
                    : "bg-green-50 text-green-900"
                )}
              >
                <div className={cn(
                  "p-1 rounded-full",
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
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 px-6 bg-surface-subtle">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <Badge variant="outline" className="mb-4">FAQ</Badge>
            <h2 className="text-4xl font-display font-bold">
              Questions & Answers
            </h2>
          </div>
          
          <div>
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
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
