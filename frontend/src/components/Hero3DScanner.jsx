import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, Scan, Plus, ShieldCheck } from "lucide-react";
import heroImg from "../assets/hero-korean-skin-blended.png";

export default function Hero3DScanner() {
  const containerRef = useRef(null);

  // Smooth 3D tilt tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const springConfig = { damping: 25, stiffness: 120 };
  const rotateX = useSpring(useTransform(mouseY, [-200, 200], [6, -6]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-200, 200], [-6, 6]), springConfig);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    mouseX.set(e.clientX - centerX);
    mouseY.set(e.clientY - centerY);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full max-w-[560px] mx-auto select-none"
      style={{ perspective: 1200 }}
    >
      {/* Soft ethereal ambient back-glows */}
      <div className="absolute top-1/4 -right-10 w-72 h-72 rounded-full bg-tint-soft/45 filter blur-3xl pointer-events-none -z-10" />
      <div className="absolute bottom-10 left-0 w-80 h-80 rounded-full bg-apricot/20 filter blur-3xl pointer-events-none -z-10" />

      {/* Main 3D Tilting Canvas */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
        }}
        className="relative w-full flex items-center justify-center"
      >
        {/* Seamless Hero Portrait */}
        <div
          className="relative w-full max-w-[500px] overflow-hidden rounded-3xl"
          style={{ transform: "translateZ(10px)" }}
        >
          <img
            src={heroImg}
            alt="AI Skin Analysis Portrait"
            className="w-full h-auto object-contain drop-shadow-2xl transition-transform duration-500 hover:scale-[1.01]"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src =
                "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=900&q=80";
            }}
          />

          {/* Interactive Dynamic Constellation Neural Mesh Overlay */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 520 645"
            fill="none"
          >
            {/* Soft geometric neural links */}
            <g stroke="rgba(255, 255, 255, 0.75)" strokeWidth="1.2">
              <line x1="335" y1="230" x2="385" y2="290" />
              <line x1="385" y1="290" x2="435" y2="340" />
              <line x1="385" y1="290" x2="345" y2="365" />
              <line x1="345" y1="365" x2="395" y2="430" />
              <line x1="395" y1="430" x2="445" y2="475" />
              <line x1="345" y1="365" x2="305" y2="415" />
              <line x1="305" y1="415" x2="355" y2="475" />
              <line x1="335" y1="230" x2="295" y2="305" />
              <line x1="295" y1="305" x2="345" y2="365" />
              <line x1="295" y1="305" x2="255" y2="375" />
              <line x1="255" y1="375" x2="305" y2="415" />
            </g>

            {/* Glowing neural star nodes */}
            <g>
              {/* Cheek Highlight Point */}
              <circle cx="345" cy="365" r="5" fill="#FFFFFF" />
              <circle cx="345" cy="365" r="14" fill="rgba(255,255,255,0.4)" className="animate-ping" />

              {/* Surrounding Nodes */}
              <circle cx="335" cy="230" r="3" fill="#FFFFFF" />
              <circle cx="385" cy="290" r="3.5" fill="#FFFFFF" />
              <circle cx="435" cy="340" r="3" fill="#FFFFFF" />
              <circle cx="395" cy="430" r="3.5" fill="#FFFFFF" />
              <circle cx="445" cy="475" r="2.5" fill="#FFFFFF" />
              <circle cx="305" cy="415" r="3.5" fill="#FFFFFF" />
              <circle cx="355" cy="475" r="3" fill="#FFFFFF" />
              <circle cx="295" cy="305" r="3" fill="#FFFFFF" />
              <circle cx="255" cy="375" r="3" fill="#FFFFFF" />
            </g>
          </svg>
        </div>

        {/* Top-Right Floating Card: AI Recommended Product (from Image 5) */}
        <motion.div
          className="absolute -top-3 right-0 sm:-right-4 bg-white/95 backdrop-blur-xl border border-white/60 rounded-2xl p-3.5 shadow-xl max-w-[210px] z-30"
          style={{ transform: "translateZ(45px)" }}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-cocoa mb-1">
            <span className="w-1.5 h-1.5 rounded-full bg-apricot" />
            <span>AI Recommended</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tint-subtle flex items-center justify-center text-cocoa shrink-0">
              <Sparkles className="w-5 h-5 text-apricot" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-ink truncate leading-tight">Gentle Cleansing Gel</p>
              <p className="text-[10px] text-ink/60 truncate mt-0.5">Hydrating formula</p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-extrabold text-cocoa font-mono">$29.40</span>
                <span className="w-4 h-4 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold">
                  <Plus className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Lower Floating Glass Pill: AI Scanning Status (from Image 5) */}
        <motion.div
          className="absolute bottom-12 left-4 sm:left-10 bg-white/80 backdrop-blur-xl border border-white/80 rounded-2xl px-4 py-2.5 shadow-lg flex items-center gap-3 z-30"
          style={{ transform: "translateZ(55px)" }}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping absolute" />
          </div>

          <div>
            <p className="text-xs font-bold text-ink leading-tight flex items-center gap-1.5">
              <span>AI Scanning</span>
              <ShieldCheck className="w-3.5 h-3.5 text-cocoa" />
            </p>
            <p className="text-[10px] text-ink/65 font-medium">98.7% Profile Precision</p>
          </div>

          <div className="pl-2 border-l border-tint-border/80 text-ink/70">
            <Scan className="w-4 h-4 text-cocoa" />
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
