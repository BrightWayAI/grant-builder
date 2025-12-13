"use client";

import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";
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

// How it Works - Vertical timeline with horizontal scroll cards
function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      step: 1,
      title: "Upload your RFP",
      description: "Drop in any grant announcement, RFP, or NOFO. Our AI parses it instantly.",
      icon: Upload,
      details: [
        "Extracts all required sections automatically",
        "Identifies deadlines, eligibility, and award amounts",
        "Works with PDFs, Word docs, and web pages",
      ],
    },
    {
      step: 2,
      title: "AI writes your draft",
      description: "We generate each section using your knowledge base and organizational voice.",
      icon: Sparkles,
      details: [
        "Pulls relevant data from your past proposals",
        "Matches your organization's writing style",
        "Cites your actual impact numbers and stats",
      ],
    },
    {
      step: 3,
      title: "Review & refine",
      description: "Edit inline with AI assistance. Expand, strengthen, or adjust any section.",
      icon: PenTool,
      details: [
        "Inline copilot for quick refinements",
        "Real-time word count tracking",
        "Suggestions grounded in funder priorities",
      ],
    },
    {
      step: 4,
      title: "Export & submit",
      description: "Download your polished proposal as DOCX, ready for submission.",
      icon: Download,
      details: [
        "Professional formatting preserved",
        "All sections complete and within limits",
        "Ready to submit to any portal",
      ],
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      const scrollableDistance = containerHeight - windowHeight;
      const scrolled = -rect.top;
      
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      const step = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      setActiveStep(step);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [steps.length]);

  return (
    <section 
      ref={containerRef}
      className="relative bg-surface-subtle"
      style={{ height: `${steps.length * 80}vh` }}
    >
      <div className="sticky top-0 h-screen flex items-center">
        <div className="w-full max-w-6xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-12">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              From RFP to draft in four steps
            </h2>
            <p className="text-text-secondary text-lg">
              No prompt engineering. No copy-pasting. Just upload and generate.
            </p>
          </div>
          
          {/* Steps - horizontal cards */}
          <div className="grid md:grid-cols-4 gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === activeStep;
              const isPast = index < activeStep;
              
              return (
                <div
                  key={index}
                  className={cn(
                    "relative p-6 rounded-2xl border-2 transition-all duration-500",
                    isActive 
                      ? "bg-brand text-white border-brand shadow-xl scale-105" 
                      : isPast
                        ? "bg-surface border-brand/30"
                        : "bg-surface border-border"
                  )}
                >
                  {/* Step number */}
                  <div className={cn(
                    "absolute -top-3 -left-3 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold",
                    isActive 
                      ? "bg-white text-brand" 
                      : isPast
                        ? "bg-brand text-white"
                        : "bg-surface-secondary text-text-secondary border border-border"
                  )}>
                    {isPast ? <Check className="h-4 w-4" /> : step.step}
                  </div>
                  
                  {/* Icon */}
                  <div className={cn(
                    "h-12 w-12 rounded-xl flex items-center justify-center mb-4",
                    isActive ? "bg-white/20" : "bg-brand-light"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      isActive ? "text-white" : "text-brand"
                    )} />
                  </div>
                  
                  {/* Content */}
                  <h3 className={cn(
                    "text-lg font-semibold mb-2",
                    isActive ? "text-white" : "text-text-primary"
                  )}>
                    {step.title}
                  </h3>
                  <p className={cn(
                    "text-sm mb-4",
                    isActive ? "text-white/80" : "text-text-secondary"
                  )}>
                    {step.description}
                  </p>
                  
                  {/* Details - only show on active */}
                  <div className={cn(
                    "space-y-2 transition-all duration-300 overflow-hidden",
                    isActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                  )}>
                    {step.details.map((detail, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm text-white/90">
                        <Check className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        <span>{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Progress bar */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === activeStep ? "w-8 bg-brand" : index < activeStep ? "w-2 bg-brand/50" : "w-2 bg-border"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Features section - simple grid, no fancy animations
function Features() {
  const features = [
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
  ];

  return (
    <section className="py-24 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-4xl font-display font-bold mb-4">
            Everything you need to write better grants
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div 
                key={index}
                className="p-6 rounded-xl border border-border bg-surface hover:shadow-lg hover:border-brand/30 transition-all group"
              >
                <div className="p-3 bg-brand-light rounded-xl w-fit mb-4 group-hover:bg-brand transition-colors">
                  <Icon className="h-6 w-6 text-brand group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Why Brightway section
function WhyBrightway() {
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
        <Badge variant="outline" className="mb-4 border-white/30 text-white">Why Brightway</Badge>
        <h2 className="text-4xl md:text-5xl font-display font-bold mb-16">
          Stop starting from scratch
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <div key={index} className="text-center">
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

  const principles = [
    { text: "We won't make up statistics or data", negative: true },
    { text: "We will use your real program data", negative: false },
    { text: "We won't use generic AI filler language", negative: true },
    { text: "We will match your organization's voice", negative: false },
    { text: "We won't exceed your word limits", negative: true },
    { text: "We will cite your actual impact numbers", negative: false },
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
          
          <p className="text-xl text-text-secondary max-w-2xl mx-auto mb-10">
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
            {[
              { target: 50, suffix: "%", label: "Less time per proposal" },
              { target: 10, suffix: "min", label: "To first draft" },
              { target: 100, suffix: "%", label: "Your voice & data" },
              { target: 920, suffix: "+", label: "Grants discoverable" },
            ].map((stat, index) => (
              <div key={index}>
                <AnimatedCounter target={stat.target} suffix={stat.suffix} />
                <p className="text-text-secondary mt-2">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <div id="how-it-works">
        <HowItWorks />
      </div>

      {/* Features */}
      <Features />

      {/* Why Brightway */}
      <WhyBrightway />

      {/* Principles */}
      <section className="py-24 px-6 bg-surface">
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
            {principles.map((principle, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-center gap-3 p-4 rounded-lg",
                  principle.negative 
                    ? "bg-red-50 text-red-900" 
                    : "bg-green-50 text-green-900"
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
      <section className="py-24 px-6 bg-surface">
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
