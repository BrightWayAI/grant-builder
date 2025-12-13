"use client";

import { useState, useEffect, useRef } from "react";
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

// Step 1 Mockup - Upload RFP
function UploadMockup() {
  return (
    <div className="bg-surface rounded-lg p-6 h-full">
      {/* Upload zone */}
      <div className="border-2 border-dashed border-brand rounded-xl p-8 bg-brand/5 mb-6">
        <div className="text-center">
          <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center mx-auto mb-4">
            <Upload className="h-8 w-8 text-brand" />
          </div>
          <p className="font-medium text-text-primary mb-1">Drop your RFP here</p>
          <p className="text-sm text-text-secondary">PDF, DOCX, or TXT up to 10MB</p>
        </div>
      </div>
      
      {/* Parsed result */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <Check className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-green-900">NEA-Arts-Grant-2025.pdf</p>
            <p className="text-sm text-green-700 mt-1">8 sections detected · Due March 15, 2025</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-2 py-1 bg-green-100 rounded text-xs text-green-800">$10K-$100K</span>
              <span className="px-2 py-1 bg-green-100 rounded text-xs text-green-800">501(c)(3)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Step 2 Mockup - AI Generation
function GenerateMockup() {
  return (
    <div className="bg-surface rounded-lg p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="font-semibold text-text-primary">Statement of Need</h4>
          <p className="text-xs text-text-tertiary">Section 1 of 8</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-brand/10 rounded-full">
          <Sparkles className="h-4 w-4 text-brand animate-pulse" />
          <span className="text-sm font-medium text-brand">Generating...</span>
        </div>
      </div>
      
      {/* Word count */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden">
          <div className="h-full w-[48%] bg-brand rounded-full" />
        </div>
        <span className="text-xs text-text-secondary">487 / 1000</span>
      </div>
      
      {/* Generated text */}
      <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed text-text-primary space-y-3">
        <p>
          The Springfield Arts Council has served our community for over 25 years, 
          reaching 15,000 residents annually through free public programs.
        </p>
        <p>
          Our recent community needs assessment revealed that 67% of low-income 
          families have never attended a professional arts performance
          <span className="inline-block w-2 h-4 bg-brand ml-1 animate-pulse" />
        </p>
      </div>
    </div>
  );
}

// Step 3 Mockup - Edit with Copilot
function EditMockup() {
  return (
    <div className="bg-surface rounded-lg p-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold text-text-primary">Project Description</h4>
        <div className="px-3 py-1 bg-amber-100 rounded text-xs font-medium text-amber-800">
          1,847 / 2,000 words
        </div>
      </div>
      
      {/* Text with selection */}
      <div className="bg-surface-secondary rounded-lg p-4 text-sm leading-relaxed text-text-primary mb-4">
        <p className="mb-3">
          Our summer youth arts program will expand to serve 200 additional participants.
        </p>
        <p>
          <span className="bg-brand/20 text-brand px-1 rounded">
            The program includes weekly workshops and mentorship sessions.
          </span>
        </p>
      </div>
      
      {/* Copilot popup */}
      <div className="bg-white border border-border rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-6 w-6 rounded-full bg-brand flex items-center justify-center">
            <Sparkles className="h-3 w-3 text-white" />
          </div>
          <span className="font-medium text-sm">AI Copilot</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary rounded-full text-xs font-medium transition-colors">
            ✨ Expand
          </button>
          <button className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary rounded-full text-xs font-medium transition-colors">
            Add data
          </button>
          <button className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary rounded-full text-xs font-medium transition-colors">
            Strengthen
          </button>
          <button className="px-3 py-1.5 bg-surface-secondary hover:bg-surface-tertiary rounded-full text-xs font-medium transition-colors">
            Shorten
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 4 Mockup - Export
function ExportMockup() {
  return (
    <div className="bg-surface rounded-lg p-6 h-full">
      {/* Success state */}
      <div className="text-center mb-6">
        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h4 className="text-xl font-bold text-green-900 mb-1">Proposal Complete!</h4>
        <p className="text-sm text-green-700">All 8 sections ready for submission</p>
      </div>
      
      {/* File card */}
      <div className="bg-surface-secondary rounded-lg p-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-brand/10 flex items-center justify-center">
            <FileText className="h-6 w-6 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-text-primary truncate">NEA_Arts_Proposal_Final.docx</p>
            <p className="text-xs text-text-secondary">8 sections · 4,823 words · 12 pages</p>
          </div>
        </div>
      </div>
      
      {/* Checklist */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {["All sections complete", "Word limits met", "Formatting applied", "Ready to submit"].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-text-secondary">
            <Check className="h-4 w-4 text-green-600" />
            <span>{item}</span>
          </div>
        ))}
      </div>
      
      {/* Download button */}
      <Button className="w-full">
        <Download className="h-4 w-4 mr-2" />
        Download DOCX
      </Button>
    </div>
  );
}

// How it Works - Sticky scroll with image on right
function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeStep, setActiveStep] = useState(0);
  
  const steps = [
    {
      step: 1,
      title: "Upload your RFP",
      description: "Drop in any grant announcement, RFP, or NOFO. Our AI parses the document and extracts all requirements, deadlines, sections, and eligibility criteria automatically.",
      icon: Upload,
      mockup: <UploadMockup />,
    },
    {
      step: 2,
      title: "AI writes your draft",
      description: "Using your knowledge base, we generate each section in your organization's authentic voice. Real data from your past proposals, actual impact numbers, no hallucinations.",
      icon: Sparkles,
      mockup: <GenerateMockup />,
    },
    {
      step: 3,
      title: "Review & refine",
      description: "Edit inline with our AI copilot. Select any text to expand, strengthen, or adjust tone. Real-time word count tracking keeps you within limits.",
      icon: PenTool,
      mockup: <EditMockup />,
    },
    {
      step: 4,
      title: "Export & submit",
      description: "Download your polished proposal as a professionally formatted DOCX. All sections complete, all requirements met, ready to submit to any portal.",
      icon: Download,
      mockup: <ExportMockup />,
    },
  ];

  useEffect(() => {
    const handleScroll = () => {
      if (!sectionRef.current) return;
      
      const section = sectionRef.current;
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      
      // How far into the section have we scrolled?
      const scrolledPastTop = scrollY - sectionTop + windowHeight * 0.5;
      
      // Total scrollable distance within the section
      const scrollableHeight = sectionHeight - windowHeight;
      
      if (scrollableHeight <= 0) return;
      
      // Progress from 0 to 1
      const progress = Math.max(0, Math.min(1, scrolledPastTop / scrollableHeight));
      
      // Map to step index (0 to 3)
      const stepIndex = Math.min(steps.length - 1, Math.floor(progress * steps.length));
      
      if (stepIndex !== activeStep) {
        setActiveStep(stepIndex);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll(); // Initial call
    
    return () => window.removeEventListener("scroll", handleScroll);
  }, [activeStep, steps.length]);

  return (
    <section 
      ref={sectionRef}
      className="relative bg-surface-subtle"
      style={{ minHeight: `${steps.length * 100}vh` }}
    >
      <div className="sticky top-0 min-h-screen flex items-center py-12">
        <div className="w-full max-w-7xl mx-auto px-6">
          {/* Header */}
          <div className="text-center mb-8 lg:mb-12">
            <Badge variant="outline" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-display font-bold mb-3">
              From RFP to draft in four steps
            </h2>
            <p className="text-text-secondary text-lg">
              No prompt engineering. No copy-pasting. Just upload and generate.
            </p>
          </div>
          
          {/* Content */}
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start">
            {/* Steps list - left side */}
            <div className="w-full lg:w-2/5 space-y-3">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === activeStep;
                const isPast = index < activeStep;
                
                return (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={cn(
                      "w-full text-left relative p-4 lg:p-5 rounded-xl border-2 transition-all duration-300",
                      isActive 
                        ? "bg-brand text-white border-brand shadow-lg scale-[1.02]" 
                        : isPast
                          ? "bg-surface border-brand/30 hover:border-brand/50"
                          : "bg-surface border-border hover:border-brand/30"
                    )}
                  >
                    <div className="flex items-start gap-4">
                      {/* Step number */}
                      <div className={cn(
                        "flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm",
                        isActive 
                          ? "bg-white text-brand" 
                          : isPast
                            ? "bg-brand text-white"
                            : "bg-surface-secondary text-text-secondary"
                      )}>
                        {isPast ? <Check className="h-5 w-5" /> : step.step}
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={cn(
                            "h-5 w-5 flex-shrink-0",
                            isActive ? "text-white" : "text-brand"
                          )} />
                          <h3 className={cn(
                            "font-semibold text-lg",
                            isActive ? "text-white" : "text-text-primary"
                          )}>
                            {step.title}
                          </h3>
                        </div>
                        <p className={cn(
                          "text-sm leading-relaxed transition-all duration-300",
                          isActive ? "text-white/90 max-h-40" : "text-text-secondary max-h-10 overflow-hidden"
                        )}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            
            {/* Mockup - right side */}
            <div className="w-full lg:w-3/5 lg:sticky lg:top-24">
              <div className="relative">
                {/* Browser chrome */}
                <div className="rounded-xl border border-border bg-white shadow-2xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-surface-secondary border-b border-border">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                    <div className="flex-1 mx-4">
                      <div className="bg-surface rounded-md px-3 py-1 text-xs text-text-tertiary text-center max-w-xs mx-auto">
                        app.brightwayai.com
                      </div>
                    </div>
                  </div>
                  
                  {/* Mockup content */}
                  <div className="relative aspect-[4/3] bg-surface-secondary">
                    {steps.map((step, index) => (
                      <div
                        key={index}
                        className={cn(
                          "absolute inset-0 p-4 transition-all duration-500",
                          index === activeStep 
                            ? "opacity-100 translate-x-0" 
                            : index < activeStep
                              ? "opacity-0 -translate-x-8"
                              : "opacity-0 translate-x-8"
                        )}
                      >
                        {step.mockup}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Decorative blur */}
                <div className="absolute -z-10 inset-0 -m-4 bg-gradient-to-r from-brand/20 to-purple-500/20 rounded-2xl blur-2xl opacity-50" />
              </div>
            </div>
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveStep(index)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  index === activeStep 
                    ? "w-8 bg-brand" 
                    : index < activeStep 
                      ? "w-2 bg-brand/50 hover:bg-brand/70" 
                      : "w-2 bg-border hover:bg-brand/30"
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// Features section
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
