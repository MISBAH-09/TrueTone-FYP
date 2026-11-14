import { useRef, useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ChevronDown, Check, RotateCcw, ImageOff } from "lucide-react";
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
            <motion.span
              key={caption}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.25 }}
              className="tt-mono text-[11px] font-medium text-cocoa-light"
            >
              {caption}
            </motion.span>
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
      className={`flex items-center gap-3 relative text-left w-full group cursor-pointer ${isMuted ? "opacity-50" : ""}`}
      aria-label={`Go to step ${index + 1}: ${title}`}
      aria-current={isActive ? "step" : undefined}
    >
      {/* dot */}
      <span
        className={`absolute -left-[23px] rounded-full transition-all duration-300
          ${isActive
            ? "w-3 h-3 bg-cocoa ring-4 ring-paper border border-cocoa"
            : isCompleted
              ? "w-2.5 h-2.5 bg-cocoa ring-2 ring-paper"
              : "w-1.5 h-1.5 bg-tint-border ring-2 ring-paper"
          }`}
      />
      <span className={`tt-mono text-xs ${isActive ? "text-cocoa font-semibold" : "text-cocoa-light"}`}>
        {pad(index + 1)}
      </span>
      <span className={`text-sm ${isActive ? "font-medium text-ink" : "text-cocoa-light"}`}>
        {title}
      </span>
      {isActive && (
        <span className="ml-auto text-[10px] uppercase tt-mono px-2 py-0.5 rounded bg-badge text-cocoa font-medium">
          Active
        </span>
      )}
    </button>
  );
}

/* ─── main component ─── */
export default function HowItWorks() {
  const sectionRef = useRef(null);
  const prefersReduced = useReducedMotion();
  const isDesktop = useIsDesktop();

  const allSlides = useMemo(() => buildSlideMap(STEPS), []);
  const starts = useMemo(() => stepStartSlide(STEPS), []);
  const totalSlides = allSlides.length;

  // Scroll-driven state (desktop)
  const [globalSlideIndex, setGlobalSlideIndex] = useState(0);

  // Mobile auto-advance state
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
  const touchRef = useRef({ x: 0, y: 0 });

  const currentIndex = isDesktop ? globalSlideIndex : mobileSlideIndex;
  const currentSlide = allSlides[currentIndex] || allSlides[0];
  const currentStepIndex = currentSlide.stepIndex;
  const currentStep = STEPS[currentStepIndex];

  /* ─── scroll handler (desktop) ─── */
  useEffect(() => {
    if (!isDesktop) return;
    const el = sectionRef.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const sectionH = el.offsetHeight;
      const vh = window.innerHeight;
      const scrolled = -rect.top;
      const scrollable = sectionH - vh;
      if (scrollable <= 0) return;
      const progress = Math.max(0, Math.min(1, scrolled / scrollable));
      const idx = Math.min(totalSlides - 1, Math.floor(progress * totalSlides));
      setGlobalSlideIndex(idx);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop, totalSlides]);

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
    const el = sectionRef.current;
    if (!el) return;
    const sectionTop = el.offsetTop;
    const sectionH = el.offsetHeight;
    const vh = window.innerHeight;
    const scrollable = sectionH - vh;
    const targetScroll = sectionTop + (idx / totalSlides) * scrollable;
    window.scrollTo({ top: targetScroll, behavior: "smooth" });
  }, [isDesktop, totalSlides]);

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
        ref={sectionRef}
        id="how-it-works"
        className="relative bg-paper"
        style={{ height: `${totalSlides * 50}vh` }}
        role="region"
        aria-label="How TrueTone works"
      >
        <div className="sticky top-0 flex h-screen flex-col justify-between px-8 py-8 lg:px-12 lg:py-10 overflow-hidden">
          {/* ── TOP: label + progress ── */}
          <header>
            <div className="mb-3 flex items-center justify-between text-xs font-medium uppercase tracking-wider">
              <div className="flex items-center gap-2 tt-mono text-cocoa-light">
                <span className="h-1.5 w-1.5 rounded-full bg-apricot" />
                <span>How TrueTone works</span>
              </div>
              <span className="tt-mono text-cocoa">
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
          <main className="my-auto grid flex-1 grid-cols-12 items-center gap-8 lg:gap-12">
            {/* LEFT — 4 cols */}
            <div className="col-span-4 flex flex-col justify-between pr-4">
              {/* Step pill + title + subtitle */}
              <AnimatePresence mode="wait">
                <motion.div key={currentStepIndex} {...fadeOnly}>
                  <div className="mb-4 inline-flex items-center gap-2 rounded border border-tint-border bg-badge/40 px-2.5 py-1 tt-mono text-sm font-semibold tracking-widest text-apricot">
                    STEP {pad(currentStepIndex + 1)}
                  </div>
                  <h2 className="tt-serif text-5xl font-normal leading-[1.1] tracking-tight text-ink">
                    {currentStep.title}
                  </h2>
                  <p className="mt-4 text-base leading-relaxed text-cocoa-light">
                    {currentStep.subtitle}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Step list with vertical line */}
              <nav className="relative mt-10 pl-6 py-2" aria-label="Steps">
                {/* background line */}
                <div className="absolute left-[7px] top-3 bottom-3 w-[1.5px] bg-tint-border" />
                {/* active fill line */}
                <div
                  className="absolute left-[7px] top-3 w-[1.5px] bg-apricot transition-all duration-500 ease-out"
                  style={{ height: `${verticalLineProgress * 100}%` }}
                />
                <div className="space-y-5 text-sm">
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
            <div className="col-span-8 flex flex-col items-center">
              {/* Caption pill above browser */}
              <div className="mb-3 w-full px-1">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentSlide.caption}
                    {...fadeOnly}
                    className="inline-flex items-center gap-2 rounded-full border border-tint-border bg-badge/70 px-3 py-1 text-xs font-medium text-cocoa"
                  >
                    {currentSlide.caption}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Browser frame with screenshot */}
              <div className="relative w-full">
                <BrowserFrame caption={currentSlide.caption}>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentIndex}
                      {...fadeSlideUp}
                      className="absolute inset-0"
                    >
                      <SlideImage
                        src={currentSlide.src}
                        alt={currentSlide.caption}
                        className="h-full w-full object-contain object-center"
                      />
                    </motion.div>
                  </AnimatePresence>
                </BrowserFrame>

                {/* Step 6 ingredient chips */}
                {currentStepIndex === 5 && (
                  <div className="absolute -right-4 top-12 hidden xl:flex flex-col gap-4 z-20">
                    {INGREDIENT_CHIPS.map((chip, i) => (
                      <motion.div
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
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Filmstrip */}
              <div className="mt-5 flex w-full items-center gap-3">
                <span className="mr-1 tt-mono text-[11px] uppercase tracking-wider text-cocoa-light/70">
                  Views:
                </span>
                {currentStep.slides.map((slide, i) => {
                  const isActiveThumb = currentSlide.slideInStep === i;
                  return (
                    <button
                      key={slide.src}
                      onClick={() => scrollToSlide(starts[currentStepIndex] + i)}
                      className={`relative overflow-hidden rounded-md bg-white p-0.5 transition cursor-pointer
                        ${isActiveThumb
                          ? "ring-2 ring-apricot shadow-sm"
                          : "border border-tint-border opacity-70 hover:opacity-100 hover:border-badge"
                        }`}
                      aria-label={`View: ${slide.caption}`}
                    >
                      <div className="w-24" style={{ aspectRatio: "16 / 10" }}>
                        <SlideImage
                          src={slide.src}
                          alt={slide.caption}
                          className="h-full w-full rounded object-contain object-center bg-[#FAF5F1]"
                        />
                      </div>
                    </button>
                  );
                })}
                {/* Step 6 "Rescan any time" pill */}
                {currentStepIndex === 5 && (
                  <div className="ml-auto flex items-center gap-2 rounded-full border border-tint-border bg-badge/40 px-3 py-1 text-xs font-medium text-cocoa-light">
                    <RotateCcw className="h-3.5 w-3.5 text-cocoa" />
                    <span>Rescan any time</span>
                  </div>
                )}
              </div>
            </div>
          </main>

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
                    onClick={() => scrollToStep(i)}
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
                  <span>Scroll to advance</span>
                  <ChevronDown className="h-3.5 w-3.5 text-cocoa" />
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
      className="bg-paper px-4 py-12 sm:px-6 sm:py-16"
      role="region"
      aria-label="How TrueTone works"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="mx-auto max-w-2xl">
        {/* Label */}
        <div className="mb-4 flex items-center gap-2 tt-mono text-xs font-medium uppercase tracking-wider text-cocoa-light">
          <span className="h-1.5 w-1.5 rounded-full bg-apricot" />
          <span>How TrueTone works</span>
        </div>

        {/* Progress bar */}
        <div className="mb-6 h-1 w-full overflow-hidden rounded-full bg-tint-border">
          <div
            className="h-full rounded-full bg-apricot transition-all duration-300"
            style={{ width: `${overallProgress * 100}%` }}
          />
        </div>

        {/* Step pill + title */}
        <div className="mb-2 inline-flex items-center gap-2 rounded border border-tint-border bg-badge/40 px-2.5 py-1 tt-mono text-sm font-semibold tracking-widest text-apricot">
          STEP {pad(currentStepIndex + 1)}
        </div>
        <h2 className="tt-serif text-3xl font-normal leading-tight tracking-tight text-ink sm:text-4xl">
          {currentStep.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-cocoa-light">
          {currentStep.subtitle}
        </p>

        {/* Browser frame */}
        <div className="mt-6">
          <BrowserFrame caption={currentSlide.caption}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                {...(prefersReduced ? {} : fadeSlideUp)}
                className="absolute inset-0"
              >
                <SlideImage
                  src={currentSlide.src}
                  alt={currentSlide.caption}
                  className="h-full w-full object-contain object-center"
                />
              </motion.div>
            </AnimatePresence>
          </BrowserFrame>
        </div>

        {/* Filmstrip */}
        <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2">
          {currentStep.slides.map((slide, i) => {
            const isActiveThumb = currentSlide.slideInStep === i;
            return (
              <button
                key={slide.src}
                onClick={() => setMobileSlideIndex(starts[currentStepIndex] + i)}
                className={`relative shrink-0 overflow-hidden rounded-md bg-white p-0.5 transition cursor-pointer
                  ${isActiveThumb
                    ? "ring-2 ring-apricot shadow-sm"
                    : "border border-tint-border opacity-70"
                  }`}
                aria-label={`View: ${slide.caption}`}
              >
                <div className="w-20" style={{ aspectRatio: "16 / 10" }}>
                  <SlideImage
                    src={slide.src}
                    alt={slide.caption}
                    className="h-full w-full rounded object-contain object-center bg-[#FAF5F1]"
                  />
                </div>
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

