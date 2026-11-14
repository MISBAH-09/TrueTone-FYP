import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TrueToneLogo from "../components/TrueToneLogo";
import HeroDermalScanner from "../components/HeroDermalScanner";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import { Button, ReportPanel } from "../components/ui";

const features = [
  {
    title: "AI Skin Analysis",
    description:
      "Upload a photo and our CNN-powered engine detects your skin type, tone, and conditions instantly.",
  },
  {
    title: "Product Scanner",
    description:
      "Scan product labels with OCR to extract ingredients and flag harmful chemicals for your skin.",
  },
  {
    title: "Smart Recommendations",
    description:
      "Get personalized product suggestions tailored to your unique skin profile and concerns.",
  },
  {
    title: "Track Progress",
    description:
      "Monitor your skin health journey over time with visual analytics and improvement insights.",
  },
];


const Landing = () => {
  return (
    <div className="min-h-screen bg-[var(--tt-paper-warm)] text-[var(--tt-ink)]">
      <nav className="fixed inset-x-0 top-0 z-50 border-b border-[var(--tt-border)] bg-[var(--tt-paper-warm)]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <TrueToneLogo />
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-[var(--tt-secondary)] hover:text-[var(--tt-ink)]">
              Features
            </a>
            <a href="#how-it-works" className="text-sm text-[var(--tt-secondary)] hover:text-[var(--tt-ink)]">
              How It Works
            </a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth?signup=true">
              <Button variant="primary">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      <section className="relative mx-auto max-w-7xl px-4 pt-12 sm:pt-14 md:pt-14 pb-4 sm:pb-6 md:pb-8 overflow-hidden">
        {/* Soft atmospheric background illumination */}
        <div className="absolute top-1/4 left-1/4 w-[420px] h-[420px] rounded-full bg-apricot/15 filter blur-3xl pointer-events-none -z-10 animate-pulse duration-1000" />
        <div className="absolute top-10 right-10 w-[450px] h-[450px] rounded-full bg-tint-soft/60 filter blur-3xl pointer-events-none -z-10" />

        <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8 relative">
          {/* Left Column: Stitched Typography & CTAs */}
          <div className="lg:col-span-6 z-10">
            {/* Eyebrow badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 border border-tint-border text-xs font-semibold text-cocoa tracking-wide mb-3 shadow-xs backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-apricot animate-pulse" />
              <span>TrueTone: Skin analysis and product recommendation system</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-[52px] font-extrabold tracking-tight text-ink leading-[1.12]">
              Know what belongs <br className="hidden sm:inline" />
              on{" "}
              <span className="text-cocoa relative inline-block">
                your skin
                <span className="absolute -bottom-1 left-0 right-0 h-1.5 bg-apricot/30 rounded-full" />
              </span>
              .
            </h1>

            {/* Subtitle */}
            <p className="mt-4 text-base sm:text-lg leading-relaxed text-ink/75 max-w-lg font-normal">
              TrueTone analyzes your skin with CNN models, reads product labels, and recommends
              products matched to your profile, allergies, and conditions.
            </p>

            {/* Action buttons */}
            <div className="mt-6 sm:mt-7 flex flex-wrap items-center gap-3">
              <Link to="/auth?signup=true">
                <button className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-cocoa text-paper font-semibold text-sm shadow-md hover:bg-cocoa-light hover:shadow-xl transition-all transform active:scale-95 cursor-pointer">
                  <span>Start Free Analysis</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <a href="#features">
                <button className="inline-flex items-center justify-center gap-2 px-7 py-3 rounded-full bg-white/80 hover:bg-white text-cocoa-dark border border-tint-border font-semibold text-sm shadow-xs hover:shadow-md transition-all cursor-pointer backdrop-blur-sm">
                  <span>Explore Technology</span>
                </button>
              </a>
            </div>
          </div>

          {/* Right Column: Seamless 5-Frame Motion Graphics (Moved up slightly without going behind header) */}
          <div className="lg:col-span-6 flex justify-center items-center z-10 -translate-y-5 sm:-translate-y-6">
            <HeroDermalScanner />
          </div>
        </div>
      </section>

      <HowItWorks />

      <section id="features" className="border-t border-[var(--tt-border)] bg-[var(--tt-paper)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <PageSection
            eyebrow="Features"
            title="Tools built around your skin profile"
            subtitle="Analyze skin, read labels, recommend products, and track changes — one Clinical report system."
          />
          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((feature) => (
              <ReportPanel key={feature.title} title={feature.title}>
                <p className="text-sm leading-6 text-[var(--tt-secondary)]">{feature.description}</p>
              </ReportPanel>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-[var(--tt-border)] bg-[var(--tt-paper)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <ReportPanel>
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-[var(--tt-ink)]">Start your skin journey</h2>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--tt-secondary)]">
                  Create an account to run a skin analysis, scan product labels, and get recommendations
                  matched to your allergies and conditions.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/auth?signup=true">
                  <Button variant="primary" className="px-5">
                    Create Free Account
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button variant="secondary" className="px-5">
                    Learn More
                  </Button>
                </a>
              </div>
            </div>
          </ReportPanel>
        </div>
      </section>

      <footer className="border-t border-[var(--tt-border)] py-8 text-center text-sm text-[var(--tt-secondary)]">
        © 2026 TrueTone. Smart Skin Analysis and Product Safety System.
      </footer>
    </div>
  );
};

function PageSection({ eyebrow, title, subtitle }) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-[var(--tt-primary)]">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-3xl">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-[var(--tt-secondary)] sm:text-base">{subtitle}</p>
    </div>
  );
}

export default Landing;
