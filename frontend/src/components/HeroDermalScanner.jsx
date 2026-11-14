import { useState, useEffect, useRef } from "react";

const FRAMES = [
  { id: 0, src: "/frames/hero-mesh-1.webp", fallback: "/frames/Frame 1.jfif" },
  { id: 1, src: "/frames/hero-mesh-2.webp", fallback: "/frames/Frame 2.jfif" },
  { id: 2, src: "/frames/hero-mesh-3.webp", fallback: "/frames/Frame 3.jfif" },
  { id: 3, src: "/frames/hero-mesh-4.webp", fallback: "/frames/Frame 4.jfif" },
  { id: 4, src: "/frames/hero-mesh-5.webp", fallback: "/frames/Frame 5.jfif" },
];

export default function HeroDermalScanner() {
  const [opacities, setOpacities] = useState([1, 0, 0, 0, 0]);
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Preload all 5 transparent feathered frames immediately
  useEffect(() => {
    FRAMES.forEach((frame) => {
      const img = new Image();
      img.src = frame.src;
      img.onerror = () => {
        img.src = frame.fallback;
      };
    });
  }, []);

  // Continuous, non-stopping 1 -> 5 -> 1 -> 5 loop
  useEffect(() => {
    const CYCLE_DURATION = 4600; // ms

    const animate = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const cycleTime = elapsed % CYCLE_DURATION;
      const nextOpacities = [0, 0, 0, 0, 0];

      if (cycleTime < 3200) {
        // Continuous scan through frames 1 -> 2 -> 3 -> 4 -> 5
        const scanProgress = (cycleTime / 3200) * 4; // 0.0 to 4.0
        const fromIdx = Math.floor(scanProgress);
        const toIdx = Math.min(4, fromIdx + 1);
        const fraction = scanProgress - fromIdx;

        nextOpacities[fromIdx] = 1 - fraction;
        nextOpacities[toIdx] = fraction;
      } else if (cycleTime < 4000) {
        // Hold on Frame 5 to showcase the radiant glass skin finish
        nextOpacities[4] = 1;
      } else {
        // Smooth dissolve from Frame 5 back to Frame 1
        const dissolveFraction = (cycleTime - 4000) / 600;
        nextOpacities[4] = Math.max(0, 1 - dissolveFraction);
        nextOpacities[0] = Math.min(1, dissolveFraction);
      }

      setOpacities(nextOpacities);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-[560px] lg:max-w-[620px] mx-auto select-none">
      {/* Radiant ambient back-glows that blend with the background */}
      <div className="absolute top-1/4 -right-12 w-96 h-96 rounded-full bg-apricot/20 filter blur-3xl pointer-events-none -z-10 animate-pulse duration-1000" />
      <div className="absolute bottom-10 -left-8 w-80 h-80 rounded-full bg-tint-soft/50 filter blur-3xl pointer-events-none -z-10" />

      {/* Main Motion Graphic: Full-bleed seamless canvas (NO card border, NO card box) */}
      <div className="relative w-full aspect-[4/4.3] sm:aspect-[4/4.2] flex items-center justify-center">
        {/* Continuous 5-Frame Stack seamlessly dissolving into page */}
        {FRAMES.map((frame, index) => (
          <img
            key={frame.id}
            src={frame.src}
            alt={`Skin scan stage ${frame.id + 1}`}
            loading="eager"
            onError={(e) => {
              e.currentTarget.src = frame.fallback;
            }}
            className="absolute inset-0 w-full h-full object-contain pointer-events-none will-change-[opacity]"
            style={{
              opacity: opacities[index],
            }}
          />
        ))}
      </div>
    </div>
  );
}
