import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class", "[data-theme='dark']"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ========================================
         COLORS - Reference CSS Variables
         ======================================== */
      colors: {
        // Semantic colors
        brand: {
          DEFAULT: "var(--brand-primary)",
          hover: "var(--brand-primary-hover)",
          active: "var(--brand-primary-active)",
          light: "var(--brand-primary-light)",
        },
        surface: {
          page: "var(--surface-page)",
          card: "var(--surface-card)",
          elevated: "var(--surface-elevated)",
          overlay: "var(--surface-overlay)",
          ai: "var(--surface-ai)",
        },
        text: {
          primary: "var(--text-primary)",
          secondary: "var(--text-secondary)",
          tertiary: "var(--text-tertiary)",
          placeholder: "var(--text-placeholder)",
          disabled: "var(--text-disabled)",
          inverse: "var(--text-inverse)",
          brand: "var(--text-brand)",
          ai: "var(--text-ai)",
        },
        border: {
          DEFAULT: "var(--border-default)",
          muted: "var(--border-muted)",
          strong: "var(--border-strong)",
          focus: "var(--border-focus)",
          ai: "var(--border-ai)",
        },
        status: {
          success: "var(--status-success)",
          "success-light": "var(--status-success-light)",
          warning: "var(--status-warning)",
          "warning-light": "var(--status-warning-light)",
          error: "var(--status-error)",
          "error-light": "var(--status-error-light)",
          info: "var(--status-info)",
          "info-light": "var(--status-info-light)",
        },
        ai: {
          DEFAULT: "var(--color-ai-500)",
          light: "var(--color-ai-100)",
          dark: "var(--color-ai-700)",
        },
        // Primitive gray scale (for direct access when needed)
        gray: {
          50: "var(--color-gray-50)",
          100: "var(--color-gray-100)",
          200: "var(--color-gray-200)",
          300: "var(--color-gray-300)",
          400: "var(--color-gray-400)",
          500: "var(--color-gray-500)",
          600: "var(--color-gray-600)",
          700: "var(--color-gray-700)",
          800: "var(--color-gray-800)",
          900: "var(--color-gray-900)",
          950: "var(--color-gray-950)",
        },
        gold: {
          50: "var(--color-gold-50)",
          100: "var(--color-gold-100)",
          200: "var(--color-gold-200)",
          300: "var(--color-gold-300)",
          400: "var(--color-gold-400)",
          500: "var(--color-gold-500)",
          600: "var(--color-gold-600)",
          700: "var(--color-gold-700)",
          800: "var(--color-gold-800)",
          900: "var(--color-gold-900)",
        },
        // Shadcn compatibility
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        input: "var(--input)",
        ring: "var(--ring)",
      },
      
      /* ========================================
         TYPOGRAPHY
         ======================================== */
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "Consolas", "monospace"],
      },
      fontSize: {
        xs: ["var(--text-xs)", { lineHeight: "var(--leading-normal)" }],
        sm: ["var(--text-sm)", { lineHeight: "var(--leading-normal)" }],
        base: ["var(--text-base)", { lineHeight: "var(--leading-relaxed)" }],
        lg: ["var(--text-lg)", { lineHeight: "var(--leading-relaxed)" }],
        xl: ["var(--text-xl)", { lineHeight: "var(--leading-snug)" }],
        "2xl": ["var(--text-2xl)", { lineHeight: "var(--leading-snug)" }],
        "3xl": ["var(--text-3xl)", { lineHeight: "var(--leading-tight)" }],
        "4xl": ["var(--text-4xl)", { lineHeight: "var(--leading-tight)" }],
        "5xl": ["var(--text-5xl)", { lineHeight: "var(--leading-tight)" }],
      },
      letterSpacing: {
        tight: "var(--tracking-tight)",
        normal: "var(--tracking-normal)",
        wide: "var(--tracking-wide)",
      },
      lineHeight: {
        tight: "var(--leading-tight)",
        snug: "var(--leading-snug)",
        normal: "var(--leading-normal)",
        relaxed: "var(--leading-relaxed)",
      },
      
      /* ========================================
         SPACING
         ======================================== */
      spacing: {
        "0": "var(--space-0)",
        "1": "var(--space-1)",
        "2": "var(--space-2)",
        "3": "var(--space-3)",
        "4": "var(--space-4)",
        "5": "var(--space-5)",
        "6": "var(--space-6)",
        "8": "var(--space-8)",
        "10": "var(--space-10)",
        "12": "var(--space-12)",
        "16": "var(--space-16)",
        "20": "var(--space-20)",
        "24": "var(--space-24)",
      },
      
      /* ========================================
         BORDER RADIUS
         ======================================== */
      borderRadius: {
        sm: "var(--radius-sm)",
        DEFAULT: "var(--radius-md)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        full: "var(--radius-full)",
      },
      
      /* ========================================
         SHADOWS
         ======================================== */
      boxShadow: {
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        DEFAULT: "var(--shadow-md)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        focus: "var(--shadow-focus)",
        ai: "var(--shadow-ai)",
        none: "none",
      },
      
      /* ========================================
         TRANSITIONS
         ======================================== */
      transitionDuration: {
        fast: "var(--duration-fast)",
        normal: "var(--duration-normal)",
        slow: "var(--duration-slow)",
        slower: "var(--duration-slower)",
      },
      transitionTimingFunction: {
        "ease-out": "var(--ease-out)",
        "ease-in-out": "var(--ease-in-out)",
        spring: "var(--ease-spring)",
      },
      
      /* ========================================
         ANIMATIONS
         ======================================== */
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        shimmer: {
          "0%": { backgroundPosition: "200% 0" },
          "100%": { backgroundPosition: "-200% 0" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-out": {
          "0%": { opacity: "1" },
          "100%": { opacity: "0" },
        },
        "slide-in-from-bottom": {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "slide-in-from-top": {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "fade-in": "fade-in var(--duration-normal) var(--ease-out)",
        "fade-out": "fade-out var(--duration-normal) var(--ease-out)",
        "slide-in-bottom": "slide-in-from-bottom var(--duration-slow) var(--ease-out)",
        "slide-in-top": "slide-in-from-top var(--duration-slow) var(--ease-out)",
        "scale-in": "scale-in var(--duration-normal) var(--ease-out)",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      
      /* ========================================
         LAYOUT
         ======================================== */
      maxWidth: {
        narrow: "720px",
        content: "1200px",
        wide: "1400px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
