import { useContext } from "react";
import { motion as Motion, useReducedMotion } from "framer-motion";
import StaggerContext from "./StaggerContext";

const offsets = {
  up: { x: 0, y: 24 },
  left: { x: -24, y: 0 },
  right: { x: 24, y: 0 },
};

export default function Reveal({
  children,
  delay = 0,
  direction = "up",
  className = "",
}) {
  const prefersReducedMotion = useReducedMotion();
  const isStaggered = useContext(StaggerContext);

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  const offset = offsets[direction] || offsets.up;
  const variants = {
    hidden: { opacity: 0, ...offset },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut", delay },
    },
  };

  return (
    <Motion.div
      className={className}
      variants={variants}
      initial={isStaggered ? undefined : "hidden"}
      {...(isStaggered
        ? {}
        : {
            whileInView: "visible",
            viewport: { once: true, margin: "-80px" },
          })}
    >
      {children}
    </Motion.div>
  );
}
