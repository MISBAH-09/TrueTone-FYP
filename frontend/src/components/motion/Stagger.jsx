import { motion as Motion, useReducedMotion } from "framer-motion";
import StaggerContext from "./StaggerContext";

const variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

export default function Stagger({ children, className = "" }) {
  const prefersReducedMotion = useReducedMotion();

  if (prefersReducedMotion) {
    return <div className={className}>{children}</div>;
  }

  return (
    <StaggerContext.Provider value>
      <Motion.div
        className={className}
        variants={variants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-80px", amount: 0.15 }}
      >
        {children}
      </Motion.div>
    </StaggerContext.Provider>
  );
}
