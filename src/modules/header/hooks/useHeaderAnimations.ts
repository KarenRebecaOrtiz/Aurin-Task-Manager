import { useEffect, RefObject } from 'react';
import { gsap } from 'gsap';
import { LOGO_ANIMATION } from '../constants';

export const useHeaderAnimations = (iconRef: RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: LOGO_ANIMATION.scale.from },
        { 
          scale: LOGO_ANIMATION.scale.to, 
          duration: LOGO_ANIMATION.duration, 
          ease: LOGO_ANIMATION.ease 
        }
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
