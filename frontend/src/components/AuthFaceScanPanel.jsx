/**
 * Auth right panel: face-scan illustration with slow loop motion.
 * Hidden below 768px by the parent. Sample product report is not used here.
 */
export default function AuthFaceScanPanel() {
  return (
    <aside className="tt-auth-scan hidden h-full min-h-screen flex-1 flex-col justify-center bg-[var(--tt-primary)] px-8 py-12 text-white md:flex lg:px-10">
      <div className="mx-auto w-full max-w-lg">
        <div className="relative mx-auto aspect-square w-full max-w-[300px]">
          <svg
            viewBox="0 0 320 320"
            className="h-full w-full"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            {/* Face outline */}
            <ellipse cx="160" cy="168" rx="58" ry="72" stroke="rgba(255,255,255,0.9)" strokeWidth="1.5" />
            {/* Eyes */}
            <path d="M132 158c6-4 14-4 20 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M168 158c6-4 14-4 20 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            {/* Nose */}
            <path d="M160 162v22c0 4-4 8-8 8" stroke="rgba(255,255,255,0.75)" strokeWidth="1.5" strokeLinecap="round" />
            {/* Mouth */}
            <path d="M144 206c8 8 24 8 32 0" stroke="rgba(255,255,255,0.85)" strokeWidth="1.5" strokeLinecap="round" />
            {/* Brow / hairline hint */}
            <path d="M116 138c18-22 70-22 88 0" stroke="rgba(204,251,241,0.7)" strokeWidth="1.25" strokeLinecap="round" />

            {/* Connector lines to labels */}
            <path className="tt-auth-scan-line" d="M88 72 L128 128" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M160 58 L160 100" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M232 72 L192 128" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M268 160 L218 168" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M232 250 L192 210" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M160 268 L160 236" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M88 250 L128 210" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
            <path className="tt-auth-scan-line" d="M52 160 L102 168" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />

            {/* Scan line */}
            <g className="tt-auth-scan-beam">
              <line
                x1="98"
                y1="96"
                x2="222"
                y2="96"
                stroke="rgba(255,255,255,0.95)"
                strokeWidth="1.25"
              />
            </g>
          </svg>

          <span className="tt-auth-scan-label tt-auth-scan-label-1 absolute left-0 top-4 text-[11px] font-medium text-white/90">
            Skin type
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-2 absolute left-1/2 top-1 -translate-x-1/2 text-[11px] font-medium text-white/90">
            Tone
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-3 absolute right-0 top-4 text-right text-[11px] font-medium text-white/90">
            Personalized
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-4 absolute right-0 top-1/2 -translate-y-1/2 text-right text-[11px] font-medium text-white/90">
            Product
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-5 absolute bottom-8 right-0 text-right text-[11px] font-medium text-white/90">
            Skin health
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-6 absolute bottom-1 left-1/2 -translate-x-1/2 text-[11px] font-medium text-white/90">
            Tracking
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-7 absolute bottom-8 left-0 text-[11px] font-medium text-white/90">
            Glowing
          </span>
          <span className="tt-auth-scan-label tt-auth-scan-label-8 absolute left-0 top-1/2 -translate-y-1/2 text-[11px] font-medium text-white/90">
            Ingredient safety
          </span>
        </div>

        <div className="mt-8 text-center">
          <h2 className="font-serif text-3xl text-transform-uppercase font-semibold tracking-normal leading-tight text-white">
            Know what belongs on your skin
          </h2>
          <p className="mx-auto mt-4 max-w-sm text-sm leading-6 text-white/85">
            TrueTone reads your skin analysis and product labels so recommendations match your profile.
          </p>
        </div>
      </div>
    </aside>
  );
}
