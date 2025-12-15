"use client";

import { useState, useEffect } from "react";
import { WelcomeWizard } from "./welcome-wizard";

interface WelcomeWizardTriggerProps {
  shouldShow: boolean;
}

export function WelcomeWizardTrigger({ shouldShow }: WelcomeWizardTriggerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (shouldShow) {
      setOpen(true);
    }
  }, [shouldShow]);

  if (!mounted || !shouldShow || !open) return null;

  return (
    <WelcomeWizard 
      open={open} 
      onComplete={() => setOpen(false)} 
    />
  );
}
