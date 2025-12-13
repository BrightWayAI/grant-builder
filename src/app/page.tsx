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
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
          observer.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: "50px 0px 0px 0px" }
    );

    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
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
      <div className="bg-surface-secondary">
        {children}
      </div>
    </div>
  );
}

// Horizontal scroll "How it Works" section
function HorizontalScrollFeatures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const steps = [
    {
      step: 1,
      title: "Upload your RFP",
      description: "Drop in any grant announcement, RFP, or NOFO. Our AI extracts requirements, deadlines, and sections automatically.",
      icon: Upload,
      screenshot: (
        <div className="bg-surface p-6 h-[380px]">
          <div className="flex items-center gap-3 p-4 bg-brand-light rounded-lg border-2 border-dashed border-brand mb-4">
            <FileText className="h-8 w-8 text-brand" />
            <div>
              <p className="font-medium">NEA-Arts-Grant-2025.pdf</p>
              <p className="text-sm text-text-secondary">Analyzing requirements...</p>
            </div>
          </div>
          <div className="space-y-3">
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
            <div className="flex items-center gap-2 text-sm">
              <Check className="h-4 w-4 text-status-success" />
              <span>Eligibility: 501(c)(3) nonprofits</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 2,
      title: "AI writes your draft",
      description: "Using your knowledge base, we generate each section in your organization's voice with real data from your past work.",
      icon: Sparkles,
      screenshot: (
        <div className="bg-surface p-6 h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium">Statement of Need</p>
              <p className="text-xs text-text-tertiary">487 / 1000 words</p>
            </div>
            <Badge variant="outline" className="gap-1">
              <Sparkles className="h-3 w-3 animate-pulse" /> Generating
            </Badge>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed">
            <p>
              The Springfield Arts Council has served our community for over 25 years, 
              reaching 15,000 residents annually through free public programs. Despite 
              this reach, significant gaps remain in arts access.
            </p>
            <p className="mt-3">
              Our recent community needs assessment revealed that 67% of low-income 
              families have never attended a professional arts performance...
            </p>
            <span className="inline-block mt-2 animate-pulse text-brand">▊</span>
          </div>
        </div>
      ),
    },
    {
      step: 3,
      title: "Review & refine",
      description: "Edit with our inline AI copilot. Expand sections, strengthen arguments, or adjust tone—all while staying within limits.",
      icon: PenTool,
      screenshot: (
        <div className="bg-surface p-6 h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <p className="font-medium">Project Description</p>
            <p className="text-xs text-text-tertiary">1,847 / 2,000 words</p>
          </div>
          <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed">
            <p>
              Our summer youth program will expand to serve 200 additional participants.
              <span className="bg-brand/20 text-brand px-1 rounded mx-1">
                The program includes weekly workshops and mentorship.
              </span>
            </p>
            <div className="mt-4 p-3 bg-white rounded-lg border shadow-lg">
              <p className="text-xs font-medium mb-2">AI Copilot</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">
                  <Sparkles className="h-3 w-3 mr-1" /> Expand
                </Badge>
                <Badge variant="outline" className="text-xs">Add data</Badge>
                <Badge variant="outline" className="text-xs">Strengthen</Badge>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      step: 4,
      title: "Export & submit",
      description: "Download your polished proposal as DOCX, ready for submission. All formatting preserved, all requirements met.",
      icon: Download,
      screenshot: (
        <div className="bg-surface p-6 h-[380px]">
          <div className="flex items-center gap-4 p-4 bg-surface-secondary rounded-lg mb-4">
            <div className="h-12 w-12 bg-status-success/10 rounded-lg flex items-center justify-center">
              <FileText className="h-6 w-6 text-status-success" />
            </div>
            <div className="flex-1">
              <p className="font-medium">NEA_Arts_Proposal_Final.docx</p>
              <p className="text-sm text-status-success">Ready for submission</p>
            </div>
            <Button size="sm">
              <Download className="h-4 w-4 mr-1" /> Download
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
              <span>Ready to submit</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const rect = containerRef.current.getBoundingClientRect();
      const containerHeight = containerRef.current.offsetHeight;
      const windowHeight = window.innerHeight;
      
      // Progress starts when top of container hits top of viewport
      // and ends when bottom of container hits bottom of viewport
      const scrollableDistance = containerHeight - windowHeight;
      const scrolled = -rect.top;
      
      const progress = Math.max(0, Math.min(1, scrolled / scrollableDistance));
      setScrollProgress(progress);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Calculate horizontal translation based on scroll progress
  // Apply easing for smoother feel
  const easedProgress = scrollProgress < 0.5 
    ? 2 * scrollProgress * scrollProgress 
    : 1 - Math.pow(-2 * scrollProgress + 2, 2) / 2;
  const translateX = easedProgress * (steps.length - 1) * -100;

  // Taller section = more scroll distance = slower horizontal movement
  const sectionHeight = (steps.length * 2) * 100; // 800vh for 4 steps

  return (
    <section 
      ref={containerRef}
      className="relative bg-surface-subtle"
      style={{ height: `${sectionHeight}vh` }}
    >
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="h-full flex flex-col justify-center">
          {/* Header */}
          <div className="text-center mb-12 px-6">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
              From RFP to draft in four steps
            </h2>
            <p className="text-text-secondary text-lg max-w-2xl mx-auto">
              No prompt engineering. No copy-pasting. Just upload and generate.
            </p>
          </div>
          
          {/* Horizontal scrolling cards */}
          <div className="relative overflow-hidden">
            <div 
              className="flex transition-transform duration-100 ease-out"
              style={{ transform: `translateX(calc(${translateX}% + ${50 - (100 / steps.length / 2)}%))` }}
            >
              {steps.map((step, index) => (
                <div 
                  key={index}
                  className="flex-shrink-0 px-4"
                  style={{ width: `${100 / steps.length}%` }}
                >
                  <div className="max-w-lg mx-auto">
                    <ScreenshotMockup>
                      {step.screenshot}
                    </ScreenshotMockup>
                    <div className="mt-6 text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="h-10 w-10 rounded-full bg-brand text-white flex items-center justify-center font-bold">
                          {step.step}
                        </div>
                        <step.icon className="h-5 w-5 text-brand" />
                      </div>
                      <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                      <p className="text-text-secondary text-sm max-w-sm mx-auto">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Progress indicator */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, index) => {
              const stepProgress = scrollProgress * (steps.length - 1);
              const isActive = Math.round(stepProgress) === index;
              return (
                <div
                  key={index}
                  className={cn(
                    "h-2 rounded-full transition-all duration-300",
                    isActive ? "w-8 bg-brand" : "w-2 bg-border"
                  )}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// Features grid - always visible, no scroll trigger
function FeaturesGrid() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const currentRef = ref.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (currentRef) observer.observe(currentRef);
    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, []);

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
    <section ref={ref} className="py-24 px-6 bg-surface">
      <div className="max-w-6xl mx-auto">
        <div className={cn(
          "text-center mb-16 transition-all duration-700",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
        )}>
          <Badge variant="outline" className="mb-4">Features</Badge>
          <h2 className="text-4xl font-display font-bold mb-4">
            Everything you need to write better grants
          </h2>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className={cn(
                "p-6 rounded-xl border border-border bg-surface hover:shadow-lg transition-all group",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              )}
              style={{ 
                transitionDelay: isVisible ? `${index * 100}ms` : "0ms",
                transitionDuration: "700ms"
              }}
            >
              <div className="p-3 bg-brand-light rounded-xl w-fit mb-4 group-hover:bg-brand transition-colors">
                <feature.icon className="h-6 w-6 text-brand group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
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
              <Link href="#how-it-works">
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

      {/* How It Works - Horizontal Scroll */}
      <div id="how-it-works">
        <HorizontalScrollFeatures />
      </div>

      {/* Features Grid */}
      <FeaturesGrid />

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
