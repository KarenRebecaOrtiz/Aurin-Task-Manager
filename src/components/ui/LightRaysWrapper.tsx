'use client';

import React from 'react';
import LightRays, { type RaysOrigin } from './LightRays';
import styles from './LightRaysWrapper.module.scss';

interface LightRaysWrapperProps {
  raysOrigin?: RaysOrigin;
  raysColor?: string;
  raysSpeed?: number;
  lightSpread?: number;
  rayLength?: number;
  pulsating?: boolean;
  fadeDistance?: number;
  saturation?: number;
  followMouse?: boolean;
  mouseInfluence?: number;
  noiseAmount?: number;
  distortion?: number;
  introAnimation?: boolean;
}

export const LightRaysWrapper: React.FC<LightRaysWrapperProps> = (props) => {
  return (
    <div className={styles.wrapper}>
      <LightRays {...props} />
    </div>
  );
};
