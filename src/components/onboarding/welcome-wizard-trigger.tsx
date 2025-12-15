"use client";

import { useState } from "react";
import { WelcomeWizard } from "./welcome-wizard";

interface WelcomeWizardTriggerProps {
  shouldShow: boolean;
}

export function WelcomeWizardTrigger({ shouldShow }: WelcomeWizardTriggerProps) {
  const [open, setOpen] = useState(shouldShow);

  if (!shouldShow) return null;

  return (
    <WelcomeWizard 
      open={open} 
      onComplete={() => setOpen(false)} 
    />
  );
}
