
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Check,
  FlaskConical,
  MessageCircle,
  ScanFace,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import TrueToneLogo from "../components/TrueToneLogo";
import HeroDermalScanner from "../components/HeroDermalScanner";
import HowItWorks from "../components/HowItWorks/HowItWorks";
import Reveal from "../components/motion/Reveal";
import Stagger from "../components/motion/Stagger";
import ArchitectureDiagram from "../components/ArchitectureDiagram";

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

function SectionAtmosphere() {
  const prefersReducedMotion = useReducedMotion();
  const blobs = [
    "left-[-8rem] top-8 h-72 w-72 bg-apricot/25",
    "right-[-7rem] top-1/3 h-80 w-80 bg-cocoa/10",
    "bottom-[-9rem] left-1/3 h-72 w-72 bg-apricot-light/30",
  ];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
    >
      {blobs.map((blob, index) => (
        <Motion.div
          key={blob}
          className={`absolute rounded-full blur-3xl ${blob}`}
          animate={prefersReducedMotion ? { y: 0 } : { y: [0, index % 2 ? 20 : -20] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 9 + index,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                }
          }
        />
      ))}
    </div>
  );
}

function CtaScanGraphic() {
  const prefersReducedMotion = useReducedMotion();
  const chips = [
    { label: "Skin type", className: "left-0 top-7", delay: 0 },
    { label: "Tone", className: "right-0 top-16", delay: 0.6 },
    { label: "Ingredients", className: "bottom-5 left-8", delay: 1.2 },
  ];

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto hidden aspect-[1.35] w-full max-w-[390px] items-center justify-center md:flex"
    >
      <div className="absolute inset-8 rounded-full bg-apricot/15 blur-3xl" />
      <svg
        className="relative h-full w-full max-w-[320px]"
        viewBox="0 0 320 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M160 31c-43 0-73 32-73 77v21c0 39 27 72 66 81l7 2 7-2c39-9 66-42 66-81v-21c0-45-30-77-73-77Z"
          stroke="#F5C2A3"
          strokeOpacity=".9"
          strokeWidth="2"
        />
        <path
          d="M87 111c-10-4-16 4-13 15 2 9 7 15 15 16m144-31c10-4 16 4 13 15-2 9-7 15-15 16"
          stroke="#F5C2A3"
          strokeOpacity=".7"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M128 111c7-5 15-5 22 0m20 0c7-5 15-5 22 0m-32 19c-2 8-5 15-10 20 7 5 15 5 22 0m-35 19c14 9 30 9 44 0"
          stroke="#F5C2A3"
          strokeOpacity=".8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M105 93h110m-110 54h110"
          stroke="#FF9E64"
          strokeOpacity=".22"
          strokeWidth="1"
          strokeDasharray="4 6"
        />
        <Motion.rect
          x="104"
          y="92"
          width="112"
          height="2"
          rx="1"
          fill="#FF9E64"
          animate={prefersReducedMotion ? { y: 0 } : { y: [0, 53] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 3.8,
                  ease: "easeInOut",
                  repeat: Infinity,
                  repeatType: "reverse",
                }
          }
        />
        <circle cx="160" cy="145" r="77" stroke="#F5C2A3" strokeOpacity=".12" />
        <circle cx="160" cy="145" r="91" stroke="#F5C2A3" strokeOpacity=".08" />
      </svg>

      {chips.map(({ label, className, delay }) => (
        <Motion.span
          key={label}
          className={`absolute rounded-full border border-apricot-light/40 bg-cocoa/80 px-3 py-1.5 text-xs font-medium text-apricot-light shadow-lg backdrop-blur-sm ${className}`}
          animate={prefersReducedMotion ? { y: 0 } : { y: [0, -7, 0] }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : {
                  duration: 3.5,
                  delay,
                  ease: "easeInOut",
                  repeat: Infinity,
                }
          }
        >
          {label}
        </Motion.span>
      ))}
    </div>
  );
}

const AboutUs = () => {
  return (
    <section
      id="about-us"
      className="relative isolate scroll-mt-20 overflow-hidden bg-gradient-to-b from-white/65 via-white/80 to-paper/80 px-4 py-14 sm:px-6 sm:py-18 lg:px-8 lg:py-20"
      aria-labelledby="about-us-title"
    >
      <SectionAtmosphere />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-0 h-20 bg-gradient-to-b from-paper/80 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-20 bg-gradient-to-t from-paper/80 to-transparent"
      />
      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-cocoa">
            <Sparkles aria-hidden="true" className="h-4 w-4 text-apricot" />
            About TrueTone
          </p>
          <h2
            id="about-us-title"
            className="mt-3 text-3xl font-semibold tracking-tight text-ink sm:text-4xl"
          >
            Skin insights that lead to more personal choices
          </h2>
        </div>

        <Reveal className="mx-auto mt-5 max-w-4xl text-center text-base leading-7 text-secondary">
          TrueTone turns a single photo into a personal skin profile. When you
          upload an image, our system checks the photo, finds your face, and
          runs three AI models in parallel to read your skin type, tone, and
          visible conditions. That profile then drives everything else: product
          recommendations ranked for your skin, safety filters that block
          anything conflicting with your allergies or pregnancy, an ingredient
          scanner for any product label, and an assistant that answers
          questions with your profile in mind.
        </Reveal>

        <Reveal className="mt-9">
          <p className="mb-3 text-sm font-semibold text-cocoa">
            How TrueTone works under the hood
          </p>
          <ArchitectureDiagram />
          <p className="mt-4 text-center text-xs leading-5 text-secondary">
            TrueTone offers skincare guidance for informational purposes, not a
            medical diagnosis.
          </p>
        </Reveal>
      </div>
    </section>
  );
};

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
          <a
            href="#about-us"
            className="text-sm font-medium text-cocoa-light transition-colors hover:text-cocoa-dark"
          >
            About Us
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
        className="relative isolate scroll-mt-20 overflow-hidden bg-white/55 py-12 sm:py-16"
      >
        <SectionAtmosphere />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-0 h-20 bg-gradient-to-b from-paper/80 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-20 bg-gradient-to-t from-paper/80 to-transparent"
        />
        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Reveal className="mx-auto max-w-2xl text-center">
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
          </Reveal>

          <Stagger className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
            {features.map(({ icon, title, description }, index) => (
              <Reveal key={title} className="h-full">
                <article
                  className="group relative h-full rounded-2xl border border-tint-border bg-white p-6 transition duration-[250ms] hover:-translate-y-1.5 hover:border-apricot-light hover:shadow-[0_28px_56px_-14px_rgba(62,39,31,0.16),0_8px_20px_-4px_rgba(62,39,31,0.08)] motion-reduce:transform-none motion-reduce:transition-none"
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-cocoa transition-transform duration-[250ms] group-hover:scale-x-100 motion-reduce:transition-none"
                  />
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tint-subtle text-cocoa transition-[transform,background-color] duration-[250ms] group-hover:scale-[1.08] group-hover:bg-tint-soft motion-reduce:transition-none">
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
              </Reveal>
            ))}
          </Stagger>
        </div>
      </section>

      {/* How It Works */}
      <HowItWorks />

      {/* About TrueTone */}
      <AboutUs />

      {/* Call To Action */}
      <section className="relative px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-paper/75 to-transparent"
        />
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl bg-cocoa-dark px-6 py-12 text-white sm:px-10 sm:py-14 lg:px-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-32 h-96 w-96 rounded-full bg-apricot/20 blur-3xl"
          />

          <div className="relative grid items-center gap-8 md:grid-cols-[1fr_0.8fr] md:gap-10">
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

              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/auth?signup=true">
                  <span className="group relative inline-flex">
                    <span
                      aria-hidden="true"
                      className="absolute -inset-1 rounded-full bg-apricot/40 opacity-60 blur-lg transition-opacity group-hover:opacity-90"
                    />
                    <span className="relative inline-flex h-12 items-center justify-center gap-2 rounded-full border border-apricot bg-apricot px-6 text-sm font-medium text-ink transition duration-200 hover:scale-[1.02] hover:border-apricot-glow hover:bg-apricot-glow motion-reduce:transform-none">
                      Create your account
                      <ArrowRight
                        aria-hidden="true"
                        className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                      />
                    </span>
                  </span>
                </Link>

                <Link to="/auth">
                  <span className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 bg-white/10 px-6 text-sm font-medium text-white transition-colors hover:bg-white/20">
                    Sign in
                  </span>
                </Link>
              </div>
            </div>

            <CtaScanGraphic />
          </div>
        </div>
      </section>
    </main>

    {/* Footer */}
    <Reveal>
      <footer className="relative bg-gradient-to-b from-white/80 to-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-tint-border to-transparent"
        />
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
          <a
            className="transition-colors hover:text-cocoa-dark"
            href="#about-us"
          >
            About Us
          </a>
        </div>
        </div>

        <div className="bg-gradient-to-r from-transparent via-tint-border/70 to-transparent py-4 text-center text-xs text-secondary">
          © 2026 TrueTone. Skin analysis and product safety.
        </div>
      </footer>
    </Reveal>
  </div>
);

export default Landing;
