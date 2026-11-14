import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TrueToneLogo from "../components/TrueToneLogo";
import { Button, ReportPanel, Verdict, ScoreLabel, DataTable } from "../components/ui";

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

const steps = [
  {
    step: "01",
    title: "Upload & Analyze",
    desc: "Take a photo of your skin. Our CNN model identifies your skin type, tone, and any conditions.",
  },
  {
    step: "02",
    title: "Scan Products",
    desc: "Photograph product labels. OCR + NLP extracts ingredients and flags harmful substances.",
  },
  {
    step: "03",
    title: "Get Recommendations",
    desc: "Receive safe, personalized product suggestions matched to your unique skin profile.",
  },
];

const sampleRows = [
  { id: 1, name: "Fragrance", note: "Matches allergy on profile.", level: "avoid" },
  { id: 2, name: "Alcohol denat.", note: "Drying on oily acne skin.", level: "caution" },
  { id: 3, name: "Niacinamide", note: "Suits oily, acne-prone skin.", level: "safe" },
];

const sampleColumns = [
  { key: "name", header: "Ingredient" },
  { key: "verdict", header: "Verdict", render: (row) => <Verdict level={row.level} /> },
  { key: "note", header: "Note" },
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

      <section className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 md:pb-20 md:pt-28">
        <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-12">
          <div>
            <p className="text-sm font-medium text-[var(--tt-primary)]">TrueTone</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight text-[var(--tt-ink)] sm:text-5xl">
              Know what belongs on your skin
            </h1>
            <p className="mt-4 max-w-lg text-base leading-7 text-[var(--tt-secondary)]">
              TrueTone analyzes your skin with CNN models, reads product labels, and recommends
              products matched to your profile, allergies, and conditions.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/auth?signup=true">
                <Button variant="primary" className="px-5">
                  Start Free Analysis
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

          <ReportPanel className="self-start">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-[var(--tt-ink)]">Acnedol Anti acne Serum 15ml</p>
                <p className="text-xs text-[var(--tt-secondary)]">Sample scan report preview</p>
              </div>
              <span className="rounded-[var(--tt-radius)] border border-[var(--tt-border)] bg-[var(--tt-paper)] px-2 py-1 text-xs font-medium text-[var(--tt-secondary)]">
                Sample
              </span>
            </div>
            <div className="mb-4 flex flex-wrap gap-6 border-b border-[var(--tt-border)] pb-4">
              <ScoreLabel value="0.61" label="Profile score" rangeText="0 to 1" size="lg" />
              <div className="text-sm text-[var(--tt-secondary)]">
                <p className="font-medium text-[var(--tt-ink)]">Profile used in sample</p>
                <p className="mt-1">Oily · Medium · Common acne · Fragrance allergy</p>
              </div>
            </div>
            <DataTable columns={sampleColumns} rows={sampleRows} />
          </ReportPanel>
        </div>
      </section>

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

      <section id="how-it-works" className="border-t border-[var(--tt-border)] py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <PageSection
            eyebrow="How TrueTone Works"
            title="Three steps to safer skincare decisions"
            subtitle="Built for accuracy and safety: identify concerns, scan products, then get matched recommendations."
          />
          <div className="mt-8 grid gap-3 md:grid-cols-3">
            {steps.map((item) => (
              <ReportPanel key={item.step}>
                <p className="tt-mono text-sm font-medium text-[var(--tt-primary)]">{item.step}</p>
                <h3 className="mt-2 text-base font-semibold text-[var(--tt-ink)]">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-[var(--tt-secondary)]">{item.desc}</p>
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
