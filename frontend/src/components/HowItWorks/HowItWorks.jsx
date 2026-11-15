import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion as Motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight, Check, ImageOff } from "lucide-react";
import { STEPS, INGREDIENT_CHIPS } from "./stepsConfig";

/* ─── helpers ─── */
const pad = (n) => String(n).padStart(2, "0");

/** Build flat slide list with back-references to step index */
function buildSlideMap(steps) {
  const slides = [];
  steps.forEach((step, si) => {
    step.slides.forEach((slide, sli) => {
      slides.push({ ...slide, stepIndex: si, slideInStep: sli });
    });
  });
  return slides;
}

/** Compute cumulative slide offsets per step for scroll-to-step clicks */
function stepStartSlide(steps) {
  const starts = [0];
  for (let i = 0; i < steps.length - 1; i++) {
    starts.push(starts[i] + steps[i].slides.length);
  }
  return starts;
}

/* ─── sub-components ─── */

/** Image with fallback placeholder */
function SlideImage({ src, alt, className = "" }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 bg-[#FAF5F1] text-cocoa-light ${className}`}>
        <ImageOff className="h-8 w-8 opacity-40" />
        <span className="text-xs opacity-60">{alt}</span>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}

/** Browser window chrome frame */
function BrowserFrame({ caption, children }) {
  return (
    <div className="relative w-full">
      {/* warm glow */}
      <div className="absolute -inset-3 rounded-2xl bg-gradient-to-tr from-apricot/10 via-transparent to-apricot-light/8 blur-2xl pointer-events-none -z-10" />
      <div className="w-full rounded-xl border border-tint-border bg-white shadow-browser overflow-hidden">
        {/* top bar — 36px */}
        <div className="flex h-9 items-center justify-between border-b border-tint-border bg-paper-alt/80 px-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-[#D9C4B7] bg-tint-border" />
            <span className="h-2.5 w-2.5 rounded-full border border-[#D9C4B7] bg-tint-border" />
            <span className="h-2.5 w-2.5 rounded-full border border-[#D9C4B7] bg-tint-border" />
          </div>
          {/* caption pill centered */}
          <AnimatePresence mode="wait">
            <Motion.span
              key={caption}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="tt-mono text-[11px] font-medium text-cocoa-light"
            >
              {caption}
            </Motion.span>
          </AnimatePresence>
          <div className="w-10" />
        </div>
        {/* image area — fixed 16:10 aspect ratio */}
        <div className="relative w-full bg-[#FAF5F1]" style={{ aspectRatio: "16 / 10" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/** Step list item (left sidebar) */
function StepListItem({ index, title, state, onClick }) {
  const isActive = state === "active";
  const isCompleted = state === "completed";
  const isMuted = state === "upcoming";
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 relative text-left w-full pl-6 group cursor-pointer ${isMuted ? "opacity-50" : ""}`}
      aria-label={`Go to step ${index + 1}: ${title}`}
      aria-current={isActive ? "step" : undefined}
    >
      {/* dot */}
      <span
        className={`absolute left-0 rounded-full transition-all duration-300
          ${isActive
            ? "w-3 h-3 bg-cocoa ring-4 ring-paper border border-cocoa"
            : isCompleted
              ? "w-2.5 h-2.5 bg-cocoa ring-2 ring-paper"
              : "w-1.5 h-1.5 bg-tint-border ring-2 ring-paper"
          }`}
      />
      <span className={`tt-mono text-[13px] ${isActive ? "text-cocoa font-semibold" : "text-cocoa-light"}`}>
        {pad(index + 1)}
      </span>
      <span className={`text-base ${isActive ? "font-medium text-ink" : "text-cocoa-light"}`}>
        {title}
      </span>
      {isActive && (
        <span className="ml-auto text-xs uppercase tt-mono px-2 py-0.5 rounded bg-badge text-cocoa font-medium">
          Active
        </span>
      )}
    </button>
  );
}

function SlideNavigationButton({ direction, onClick, disabled }) {
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isPrevious ? "Previous screenshot" : "Next screenshot"}
      className="z-10 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-tint-border bg-white/95 text-cocoa shadow-sm transition-colors hover:border-cocoa/40 hover:bg-paper-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot disabled:cursor-not-allowed disabled:opacity-40 sm:h-10 sm:w-10"
    >
      {isPrevious ? (
        <ChevronLeft aria-hidden="true" className="h-5 w-5" />
      ) : (
        <ChevronRight aria-hidden="true" className="h-5 w-5" />
      )}
    </button>
  );
}

/* ─── main component ─── */
export default function HowItWorks() {
  const prefersReduced = useReducedMotion();
  const isDesktop = useIsDesktop();

  const allSlides = useMemo(() => buildSlideMap(STEPS), []);
  const starts = useMemo(() => stepStartSlide(STEPS), []);
  const totalSlides = allSlides.length;

  // Desktop steps are selected directly so the section stays within one viewport.
  const [globalSlideIndex, setGlobalSlideIndex] = useState(0);

  // Mobile auto-advance state
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
  const touchRef = useRef({ x: 0, y: 0 });

  const currentIndex = isDesktop ? globalSlideIndex : mobileSlideIndex;
  const currentSlide = allSlides[currentIndex] || allSlides[0];
  const currentStepIndex = currentSlide.stepIndex;
  const currentStep = STEPS[currentStepIndex];

  /* ─── mobile auto-advance ─── */
  useEffect(() => {
    if (isDesktop || prefersReduced) return;
    const timer = setInterval(() => {
      setMobileSlideIndex((prev) => (prev + 1) % totalSlides);
    }, 4000);
    return () => clearInterval(timer);
  }, [isDesktop, prefersReduced, totalSlides]);

  /* ─── mobile touch swipe ─── */
  const onTouchStart = useCallback((e) => {
    touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, []);
  const onTouchEnd = useCallback((e) => {
    const dx = e.changedTouches[0].clientX - touchRef.current.x;
    if (Math.abs(dx) > 50) {
      setMobileSlideIndex((prev) => {
        if (dx < 0) return Math.min(totalSlides - 1, prev + 1);
        return Math.max(0, prev - 1);
      });
    }
  }, [totalSlides]);

  /* ─── click-to-scroll helpers ─── */
  const scrollToSlide = useCallback((idx) => {
    if (!isDesktop) {
      setMobileSlideIndex(idx);
      return;
    }
    setGlobalSlideIndex(idx);
  }, [isDesktop]);

  const scrollToStep = useCallback((stepIdx) => {
    scrollToSlide(starts[stepIdx]);
  }, [scrollToSlide, starts]);

  /* ─── progress ─── */
  const overallProgress = totalSlides > 1 ? currentIndex / (totalSlides - 1) : 1;
  const verticalLineProgress = STEPS.length > 1 ? currentStepIndex / (STEPS.length - 1) : 1;
  const isLastSlide = currentIndex === totalSlides - 1;

  /* ─── animation variants ─── */
  const dur = prefersReduced ? 0 : 0.4;
  const fadeSlideUp = {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: dur, ease: "easeOut" },
  };
  const fadeOnly = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: dur * 0.75, ease: "easeOut" },
  };

  /* ─── preload next slide ─── */
  useEffect(() => {
    const nextIdx = currentIndex + 1;
    if (nextIdx < totalSlides) {
      const link = document.createElement("link");
      link.rel = "preload";
      link.as = "image";
      link.href = allSlides[nextIdx].src;
      document.head.appendChild(link);
      return () => document.head.removeChild(link);
    }
  }, [currentIndex, totalSlides, allSlides]);

  /* ═══════════════════ DESKTOP RENDER ═══════════════════ */
  if (isDesktop) {
    return (
      <section
        id="how-it-works"
        className="relative min-h-screen border-b border-tint-border/70 bg-paper"
        role="region"
        aria-label="How TrueTone works"
      >
        <div className="page-container flex min-h-screen flex-col justify-between py-5 lg:py-6">
          {/* ── TOP: label + progress ── */}
          <header>
            <div className="mb-3 flex items-center justify-between border-b border-tint-border/70 pb-3">
              <div className="flex items-center gap-2 tt-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-cocoa-light">
                <span className="h-1.5 w-1.5 rounded-full bg-apricot" />
                <span>How TrueTone works</span>
              </div>
              <span className="tt-mono text-xs font-medium uppercase tracking-wider text-cocoa">
                Step {pad(currentStepIndex + 1)} of {pad(STEPS.length)} · {currentStep.shortName}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-tint-border">
              <div
                className="h-full rounded-full bg-apricot transition-all duration-500 ease-out"
                style={{ width: `${overallProgress * 100}%` }}
              />
            </div>
          </header>

          {/* ── MAIN: 12-col grid ── */}
          <main className="my-auto grid flex-1 grid-cols-12 items-center gap-4 lg:gap-8">
            {/* LEFT — 4 cols */}
            <div className="col-span-4 flex flex-col justify-between pr-4">
              {/* Step pill + title + subtitle */}
              <AnimatePresence mode="wait">
                <Motion.div key={currentStepIndex} {...fadeOnly}>
                  <div className="mb-4 inline-flex items-center gap-2 rounded border border-tint-border bg-badge/40 px-2.5 py-1 tt-mono text-xs font-semibold tracking-widest text-cocoa">
                    STEP {pad(currentStepIndex + 1)}
                  </div>
                  <h2 className="font-display text-5xl font-medium leading-[1.1] tracking-[-0.01em] text-ink">
                    {currentStep.title}
                  </h2>
                  <p className="mt-4 text-lg leading-[1.7] text-cocoa-light">
                    {currentStep.subtitle}
                  </p>
                </Motion.div>
              </AnimatePresence>

              {/* Step list with vertical line */}
              <nav className="relative mt-10 py-2" aria-label="Steps">
                {/* background line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] bg-tint-border" />
                {/* active fill line */}
                <div
                  className="absolute left-[7px] top-3 w-[1.5px] bg-apricot transition-all duration-500 ease-out"
                  style={{ height: `${verticalLineProgress * 100}%` }}
                />
                <div className="space-y-[34px]">
                  {STEPS.map((step, i) => (
                    <StepListItem
                      key={i}
                      index={i}
                      title={step.title}
                      state={i < currentStepIndex ? "completed" : i === currentStepIndex ? "active" : "upcoming"}
                      onClick={() => scrollToStep(i)}
                    />
                  ))}
                </div>
              </nav>
            </div>

            {/* RIGHT — 8 cols */}
            <div className="col-span-8 flex min-w-0 flex-col items-center">
              {/* Caption pill above browser */}
              <div className="mb-3 w-full px-1">
                <AnimatePresence mode="wait">
                  <Motion.div
                    key={currentSlide.caption}
                    {...fadeOnly}
                    className="inline-flex items-center gap-2 rounded-full border border-tint-border bg-badge/70 px-3 py-1 text-xs font-medium text-cocoa"
                  >
                    {currentSlide.caption}
                  </Motion.div>
                </AnimatePresence>
              </div>

              {/* Browser frame with screenshot */}
              <div className="flex w-full min-w-0 items-center gap-2 sm:gap-3">
                <SlideNavigationButton
                  direction="previous"
                  onClick={() => scrollToSlide(Math.max(0, currentIndex - 1))}
                  disabled={currentIndex === 0}
                />
                <div className="relative min-w-0 flex-1">
                  <BrowserFrame caption={currentSlide.caption}>
                    <AnimatePresence mode="wait">
                      <Motion.div
                        key={currentIndex}
                        {...fadeSlideUp}
                        className="absolute inset-0"
                      >
                        <SlideImage
                          src={currentSlide.src}
                          alt={currentSlide.caption}
                          className="h-full w-full object-contain object-center"
                        />
                      </Motion.div>
                    </AnimatePresence>
                  </BrowserFrame>

                  {currentStepIndex === 5 && (
                    <div className="absolute -right-4 top-12 z-20 hidden flex-col gap-4 xl:flex">
                      {INGREDIENT_CHIPS.map((chip, i) => (
                        <Motion.div
                          key={chip.name}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: i * 0.15, ease: "easeOut" }}
                          className="flex items-center gap-2.5 rounded-xl border bg-white px-3.5 py-2 shadow-chip"
                          style={{ borderColor: `${chip.dotColor}30` }}
                        >
                          <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: chip.dotColor }} />
                          <div className="flex flex-col">
                            <span className="text-xs font-semibold text-ink">{chip.name}</span>
                            <span className={`tt-mono text-[10px] font-semibold uppercase tracking-wider ${chip.textColor}`}>
                              {chip.label}
                            </span>
                          </div>
                        </Motion.div>
                      ))}
                    </div>
                  )}
                </div>
                <SlideNavigationButton
                  direction="next"
                  onClick={() => scrollToSlide(Math.min(totalSlides - 1, currentIndex + 1))}
                  disabled={isLastSlide}
                />
              </div>

            </div>
          </main>

          {/* One thumbnail for each step */}
          <div className="mt-3 grid w-full grid-cols-6 gap-2 sm:gap-3">
            {STEPS.map((step, i) => {
              const slide = step.slides[0];
              const isActive = currentStepIndex === i;
              return (
                <button
                  key={step.shortName}
                  type="button"
                  onClick={() => scrollToStep(i)}
                  aria-label={`Go to step ${i + 1}: ${step.title}`}
                  aria-current={isActive ? "step" : undefined}
                  className={`min-w-0 overflow-hidden rounded-md bg-white p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot ${
                    isActive
                      ? "ring-2 ring-apricot shadow-sm"
                      : "border border-tint-border opacity-75 hover:opacity-100"
                  }`}
                >
                  <div className="w-full overflow-hidden rounded" style={{ aspectRatio: "16 / 10" }}>
                    <SlideImage
                      src={slide.src}
                      alt=""
                      className="h-full w-full object-contain object-center bg-[#FAF5F1]"
                    />
                  </div>
                  <span className="mt-1 block truncate px-0.5 text-left text-xs leading-tight text-cocoa-light">
                    {step.shortName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* ── BOTTOM: divider + dots ── */}
          <footer className="flex items-center justify-between border-t border-tint-border pt-5">
            <span className="tt-mono text-xs text-cocoa-light/80">
              {pad(currentStepIndex + 1)} / {pad(STEPS.length)}
            </span>

            {/* 6 step dots */}
            <div className="flex items-center gap-2.5">
              {STEPS.map((_, i) => {
                const isCurrent = i === currentStepIndex;
                const isDone = i < currentStepIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => scrollToStep(i)}
                    aria-current={isCurrent ? "step" : undefined}
                    className={`rounded-full transition-all duration-300 cursor-pointer
                      ${isCurrent
                        ? "h-2.5 w-2.5 bg-cocoa ring-2 ring-cocoa/20"
                        : isDone
                          ? "h-2 w-2 bg-cocoa/40"
                          : "h-2 w-2 bg-tint-border"
                      }`}
                    aria-label={`Go to step ${i + 1}: ${STEPS[i].title}`}
                  />
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs text-cocoa-light/80">
              {isLastSlide ? (
                <>
                  <span>Completed journey</span>
                  <Check className="h-3.5 w-3.5 text-cocoa" />
                </>
              ) : (
                <>
                  <span>Select a step or use arrows</span>
                  <ChevronRight className="h-3.5 w-3.5 text-cocoa" />
                </>
              )}
            </div>
          </footer>
        </div>
      </section>
    );
  }

  /* ═══════════════════ MOBILE RENDER (<1024px) ═══════════════════ */
  return (
    <section
      id="how-it-works"
      className="border-b border-tint-border/70 bg-paper py-12 sm:py-16"
      role="region"
      aria-label="How TrueTone works"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="page-container">
        {/* Label */}
        <div className="mb-6 flex items-center gap-2 border-b border-tint-border/70 pb-3 tt-mono text-[15px] font-semibold uppercase tracking-[0.16em] text-cocoa-light">
          <span className="h-1.5 w-1.5 rounded-full bg-apricot" />
          <span>How TrueTone works</span>
        </div>

        <div className="mx-auto max-w-2xl">
        {/* Progress bar */}
        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-tint-border">
          <div
            className="h-full rounded-full bg-apricot transition-all duration-300"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>

        {/* Step pill + title */}
        <div className="mb-2 inline-flex items-center gap-2 rounded border border-tint-border bg-badge/40 px-2.5 py-1 tt-mono text-[11px] font-semibold tracking-widest text-apricot sm:text-xs">
          STEP {pad(currentStepIndex + 1)}
        </div>
        <h2 className="font-display text-3xl font-medium leading-[1.1] tracking-[-0.01em] text-ink sm:text-4xl">
          {currentStep.title}
        </h2>
        <p className="mt-2 text-base leading-[1.65] text-cocoa-light sm:text-lg sm:leading-[1.7]">
          {currentStep.subtitle}
        </p>

        {/* Browser frame */}
        <div className="mt-6 flex items-center gap-2">
          <SlideNavigationButton
            direction="previous"
            onClick={() => scrollToSlide(Math.max(0, currentIndex - 1))}
            disabled={currentIndex === 0}
          />
          <div className="min-w-0 flex-1">
            <BrowserFrame caption={currentSlide.caption}>
              <AnimatePresence mode="wait">
                <Motion.div
                  key={currentIndex}
                  {...(prefersReduced ? {} : fadeSlideUp)}
                  className="absolute inset-0"
                >
                  <SlideImage
                    src={currentSlide.src}
                    alt={currentSlide.caption}
                    className="h-full w-full object-contain object-center"
                  />
                </Motion.div>
              </AnimatePresence>
            </BrowserFrame>
          </div>
          <SlideNavigationButton
            direction="next"
            onClick={() => scrollToSlide(Math.min(totalSlides - 1, currentIndex + 1))}
            disabled={isLastSlide}
          />
        </div>

        {/* One thumbnail for each step */}
        <div className="mt-4 grid grid-cols-6 gap-1.5 sm:gap-2">
          {STEPS.map((step, i) => {
            const slide = step.slides[0];
            const isActive = currentStepIndex === i;
            return (
              <button
                key={step.shortName}
                type="button"
                onClick={() => setMobileSlideIndex(starts[i])}
                aria-label={`Go to step ${i + 1}: ${step.title}`}
                aria-current={isActive ? "step" : undefined}
                className={`min-w-0 overflow-hidden rounded-md bg-white p-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-apricot
                  ${isActive
                    ? "ring-2 ring-apricot shadow-sm"
                    : "border border-tint-border opacity-75"
                  }`}
              >
                <div className="w-full overflow-hidden rounded" style={{ aspectRatio: "16 / 10" }}>
                  <SlideImage
                    src={slide.src}
                    alt=""
                    className="h-full w-full object-contain object-center bg-[#FAF5F1]"
                  />
                </div>
                <span className="mt-1 block truncate px-0.5 text-left text-[10px] leading-tight text-cocoa-light sm:text-xs">
                  {step.shortName}
                </span>
              </button>
            );
          })}
        </div>

        {/* Step dots */}
        <div className="mt-6 flex items-center justify-center gap-2.5">
          {STEPS.map((_, i) => {
            const isCurrent = i === currentStepIndex;
            const isDone = i < currentStepIndex;
            return (
              <button
                key={i}
                onClick={() => setMobileSlideIndex(starts[i])}
                className={`rounded-full transition-all cursor-pointer
                  ${isCurrent
                    ? "h-2.5 w-2.5 bg-cocoa ring-2 ring-cocoa/20"
                    : isDone
                      ? "h-2 w-2 bg-cocoa/40"
                      : "h-2 w-2 bg-tint-border"
                  }`}
                aria-label={`Go to step ${i + 1}: ${STEPS[i].title}`}
              />
            );
          })}
        </div>
        </div>
      </div>
    </section>
  );
}

/* ─── hook: detect desktop vs mobile ─── */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 1024 : true
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}
