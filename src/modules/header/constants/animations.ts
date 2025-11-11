export const LOGO_ANIMATION = {
  scale: {
    from: 0,
    to: 1,
  },
  duration: 0.6,
  ease: 'elastic.out(1,0.6)',
};

export const ADMIN_BADGE_ANIMATION = {
  initial: { scale: 0, rotate: -180 },
  animate: { scale: 1, rotate: 0 },
  transition: {
    type: "spring" as const,
    stiffness: 200,
    damping: 15,
    delay: 0.5,
  },
  whileHover: { 
    scale: 1.15, 
    rotate: 5,
    transition: { duration: 0.2 },
  },
  whileTap: { scale: 0.95 },
};
