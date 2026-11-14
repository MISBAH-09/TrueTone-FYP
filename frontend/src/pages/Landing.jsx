
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FlaskConical,
  ScanFace,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import TrueToneLogo from "../components/TrueToneLogo";
import HeroDermalScanner from "../components/HeroDermalScanner";
import HowItWorks from "../components/HowItWorks/HowItWorks";

const features = [
  {
    icon: <ScanFace aria-hidden="true" className="h-5 w-5" />,
    title: "Understand your skin",
    description:
      "Get a clear picture of your skin type, tone, and visible concerns with AI-powered analysis.",
  },
  {
    icon: <FlaskConical aria-hidden="true" className="h-5 w-5" />,
    title: "Read the ingredient list",
    description:
      "Scan a product label and review ingredient flags in the context of your profile.",
  },
  {
    icon: <Sparkles aria-hidden="true" className="h-5 w-5" />,
    title: "Find a better match",
    description:
      "Explore skincare recommendations selected around your skin profile and preferences.",
  },
  {
    icon: <TrendingUp aria-hidden="true" className="h-5 w-5" />,
    title: "See your progress",
    description:
      "Keep a visual history of your scans and follow changes in your skin over time.",
  },
];

const Landing = () => (
  <div className="min-h-screen overflow-hidden bg-paper text-ink">
    {/* Header */}
    <header className="sticky top-0 z-50 border-b border-cocoa/20 bg-paper/95 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex h-[64px] max-w-[1440px] items-center justify-between px-4 sm:px-6 lg:px-6"
      >
        <TrueToneLogo />

        <div className="hidden items-center gap-8 md:flex">
          <a
            href="#features"
            className="text-sm font-medium text-cocoa-light transition-colors hover:text-cocoa-dark"
          >
            Features
          </a>

          <a
            href="#how-it-works"
            className="text-sm font-medium text-cocoa-light transition-colors hover:text-cocoa-dark"
          >
            How it works
          </a>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/auth">
            <span className="inline-flex h-[var(--tt-control-h)] items-center justify-center rounded-full px-3 text-sm font-medium text-secondary transition-colors hover:bg-paper-alt hover:text-ink sm:px-4">
              Sign in
            </span>
          </Link>

          <Link to="/auth?signup=true">
            <span className="inline-flex h-[var(--tt-control-h)] items-center justify-center gap-2 rounded-full border border-cocoa bg-cocoa px-3 text-sm font-medium text-white transition-colors hover:border-cocoa-dark hover:bg-cocoa-dark sm:px-4">
              <span className="hidden sm:inline">Get started</span>
              <span className="sm:hidden">Start</span>
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </nav>
    </header>

    <main>
      {/* Hero Section */}
      <section className="relative mx-auto grid min-h-[min(650px,calc(100svh-170px))] max-w-[1440px] items-center gap-2 px-4 py-6 sm:px-6 sm:py-8 lg:grid-cols-2 lg:gap-6 lg:px-6 lg:py-3">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-48 top-8 h-96 w-96 rounded-full bg-tint-soft/45 blur-3xl"
        />

        {/* Left Content */}
        <div className="relative z-10 py-2 lg:py-0">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-tint-border bg-white/80 px-3.5 py-2 text-xs font-semibold tracking-wide text-cocoa shadow-sm">
            <Sparkles aria-hidden="true" className="h-4 w-4 text-apricot" />
            A more personal way to care for your skin
          </div>

          <h1 className="max-w-2xl text-4xl font-semibold leading-[1.08] tracking-tight text-ink sm:text-5xl lg:text-[3.5rem]">
            Skincare starts with{" "}
            <span className="relative inline-block text-cocoa">
              understanding.
              <span
                aria-hidden="true"
                className="absolute -bottom-1 left-0 -z-10 h-3 w-full rounded-full bg-apricot-light/70 sm:-bottom-0.5 sm:h-4"
              />
            </span>
          </h1>

          <p className="mt-4 max-w-xl text-base leading-7 text-secondary sm:text-lg sm:leading-8">
            Discover your skin profile, check product ingredients, and find
            recommendations that consider what matters to you.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link to="/auth?signup=true">
              <span className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-cocoa bg-cocoa px-6 text-sm font-medium text-white shadow-md transition hover:border-cocoa-dark hover:bg-cocoa-dark hover:shadow-lg">
                Start your free analysis
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </span>
            </Link>

            <a href="#features">
              <span className="inline-flex h-12 items-center justify-center rounded-full border border-tint-border bg-white/80 px-6 text-sm font-medium text-ink transition-colors hover:bg-paper">
                Explore TrueTone
              </span>
            </a>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm text-secondary">
            {["Skin insights", "Ingredient checks", "Progress tracking"].map(
              (item) => (
                <span key={item} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tint-soft text-cocoa">
                    <Check
                      aria-hidden="true"
                      className="h-3 w-3"
                      strokeWidth={2.5}
                    />
                  </span>
                  {item}
                </span>
              ),
            )}
          </div>
        </div>

        {/* Right Image / Dermal Scanner */}
        <div className="relative mx-auto w-full max-w-[540px] lg:max-w-[560px] lg:justify-self-end">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-10 top-12 aspect-square rounded-full bg-apricot-light/25 blur-3xl"
          />

          <div className="relative">
            <div className="mx-auto w-full max-h-[560px] overflow-hidden">
              <HeroDermalScanner />
            </div>

            <div className="absolute bottom-5 left-2 flex items-center gap-3 rounded-2xl border border-tint-border/80 bg-white/95 px-4 py-3 shadow-browser sm:bottom-8 sm:left-0">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint-subtle text-cocoa">
                <ShieldCheck aria-hidden="true" className="h-5 w-5" />
              </span>

              <span>
                <span className="block text-sm font-semibold text-ink">
                  Made for your profile
                </span>
                <span className="block text-xs text-secondary">
                  Your skin and sensitivities in mind
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="scroll-mt-20 border-y border-tint-border bg-white/70 py-12 sm:py-16"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cocoa">
              Thoughtful tools, one place
            </p>

            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              A clearer picture of your skincare
            </h2>

            <p className="mt-4 text-base leading-7 text-secondary">
              From your first skin scan to the products you choose, make each
              step feel more informed.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
            {features.map(({ icon, title, description }, index) => (
              <article
                key={title}
                className="group rounded-2xl border border-tint-border bg-white p-6 transition duration-200 hover:-translate-y-1 hover:border-apricot-light hover:shadow-browser motion-reduce:transform-none motion-reduce:transition-none"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint-subtle text-cocoa transition-colors group-hover:bg-tint-soft">
                  {icon}
                </span>

                <p className="mt-6 text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                  0{index + 1}
                </p>

                <h3 className="mt-2 text-lg font-semibold text-ink">
                  {title}
                </h3>

                <p className="mt-2 text-sm leading-6 text-secondary">
                  {description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* Call To Action */}
      <section className="px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-cocoa-dark px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-apricot/20 blur-3xl"
          />

          <div className="relative flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-apricot-light">
                Your skin, your routine
              </p>

              <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                Make your next skincare choice with more confidence.
              </h2>

              <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 sm:text-base">
                Create your profile to explore skin analysis, product safety
                checks, and recommendations in one place.
              </p>
            </div>

            <div className="flex shrink-0 flex-wrap gap-3">
              <Link to="/auth?signup=true">
                <span className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-apricot bg-apricot px-6 text-sm font-medium text-ink transition-colors hover:border-apricot-glow hover:bg-apricot-glow">
                  Create your account
                  <ArrowRight aria-hidden="true" className="h-4 w-4" />
                </span>
              </Link>

              <Link to="/auth">
                <span className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-medium text-white transition-colors hover:bg-white/20">
                  Sign in
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>

    {/* Footer */}
    <footer className="border-t border-tint-border bg-white/70">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-7 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <TrueToneLogo />

        <p className="text-sm text-secondary">
          Skin insights and product guidance, thoughtfully brought together.
        </p>

        <div className="flex items-center gap-5 text-sm font-medium text-cocoa-light">
          <a
            className="transition-colors hover:text-cocoa-dark"
            href="#features"
          >
            Features
          </a>

          <a
            className="transition-colors hover:text-cocoa-dark"
            href="#how-it-works"
          >
            How it works
          </a>
        </div>
      </div>

      <div className="border-t border-tint-border/70 py-4 text-center text-xs text-secondary">
        © 2026 TrueTone. Skin analysis and product safety.
      </div>
    </footer>
  </div>
);

export default Landing;
