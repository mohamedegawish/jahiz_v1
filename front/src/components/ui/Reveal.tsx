import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface RevealProps {
  children: React.ReactNode;
  /** Stagger delay in seconds when several reveals share a viewport. */
  delay?: number;
  className?: string;
}

/**
 * Scroll-reveal wrapper for landing sections (ui-ux-pro-max §5.C lighter alternative:
 * Motion whileInView, no ScrollTrigger). Motivated motion only: content enters once,
 * in narrative sequence. Static under prefers-reduced-motion.
 */
export const Reveal: React.FC<RevealProps> = ({ children, delay = 0, className }) => {
  const reduced = useReducedMotion() === true;
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
};
