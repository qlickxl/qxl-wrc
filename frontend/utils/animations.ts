import { Variants, Transition } from 'framer-motion';

export const timing = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6,
} as const;

export const easing = {
  standard: [0.4, 0.0, 0.2, 1] as [number, number, number, number],
  rally: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number],
  acceleration: [0.4, 0.0, 1, 1] as [number, number, number, number],
  deceleration: [0.0, 0.0, 0.2, 1] as [number, number, number, number],
  bounce: [0.68, -0.55, 0.265, 1.55] as [number, number, number, number],
} as const;

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: timing.normal, ease: easing.rally },
  },
  exit: {
    opacity: 0, scale: 0.95, y: -10,
    transition: { duration: timing.fast, ease: easing.standard },
  },
};

export const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: timing.fast } },
  exit: { opacity: 0, transition: { duration: timing.fast } },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30, scale: 0.95 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { duration: timing.slow, ease: easing.rally },
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: timing.normal, ease: easing.rally },
  },
};

export const fastStaggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05, delayChildren: 0 },
  },
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: timing.normal, ease: easing.standard },
  },
  exit: { opacity: 0, transition: { duration: timing.fast } },
};

export const slideUpVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: timing.normal, ease: easing.rally },
  },
};

export const tableRowVariants: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1, x: 0,
    transition: { duration: timing.normal, ease: easing.rally },
  },
  hover: {
    x: 4,
    transition: { duration: timing.fast, ease: easing.standard },
  },
};

export const createTransition = (
  duration: number = timing.normal,
  ease: typeof easing[keyof typeof easing] = easing.standard,
  delay: number = 0
): Transition => ({ duration, ease, delay });
