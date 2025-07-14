'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';
import styles from './LighthouseScene.module.scss';

const LighthouseScene = () => {
  const sceneRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize parallax effect if needed
    if (sceneRef.current) {
      // You can add parallax initialization here if needed
      // For now, we'll use CSS animations
    }
  }, []);

  return (
    <div className={styles.scene} ref={sceneRef}>
      <div className={styles.sky}>
        <div className={`${styles.stars} ${styles.layer}`} data-depth="0.3">
          {Array.from({ length: 80 }, (_, i) => (
            <div key={i} className={styles.star} />
          ))}
        </div>
      </div>
      <div className={styles.container}>
        <div className={`${styles.top} ${styles.layer}`} data-depth="0.1">
          <div className={styles.lightHouse}>
            <div className={styles.topTriangle}>
              <div className={styles.topTriangleCircleTop} />
              <div className={styles.topTriangleCircleMiddle} />
              <div className={styles.topTriangleCircle} />
              <div className={`${styles.glow} ${styles.layer}`} data-depth="0.01" />
              <div className={styles.shiningLightsContainer}>
                <div className={styles.shiningLightLeft} />
                <div className={styles.shiningLightRight} />
              </div>
              <div className={styles.topLedge} />
              <div className={styles.topBars}>
                <div className={`${styles.topBar1} ${styles.topbar}`} />
                <div className={`${styles.topBar2} ${styles.topbar}`} />
                <div className={`${styles.topBar3} ${styles.topbar}`} />
                <div className={`${styles.topBar4} ${styles.topbar}`} />
                <div className={`${styles.topBar5} ${styles.topbar}`} />
                <div className={`${styles.topBar6} ${styles.topbar}`} />
              </div>
              <div className={styles.topRailings}>
                <div className={`${styles.topRailing1} ${styles.railing}`} />
                <div className={`${styles.topRailing2} ${styles.railing}`} />
                <div className={`${styles.topRailing3} ${styles.railing}`} />
                <div className={`${styles.topRailing4} ${styles.railing}`} />
                <div className={`${styles.topRailing5} ${styles.railing}`} />
                <div className={`${styles.topRailing6} ${styles.railing}`} />
              </div>
              <div className={styles.midLedge} />
              <div className={styles.midRailings}>
                <div className={styles.overlay} />
                <div className={styles.midRailingsRail}>
                  <div className={`${styles.midRail} ${styles.midRail1}`} />
                  <div className={`${styles.midRail} ${styles.midRail2}`} />
                  <div className={`${styles.midRail} ${styles.midRail3}`} />
                  <div className={`${styles.midRail} ${styles.midRail5}`} />
                  <div className={`${styles.midRail} ${styles.midRail6}`} />
                </div>
                <div className={styles.leftMidRailings} />
                <div className={styles.rightMidRailings} />
              </div>
            </div>
            <div className={styles.panelContainer} id="rotate-x">
              <div className={styles.leftMidRoof2} />
              <div className={styles.panel} />
            </div>
            <div className={styles.light} />
            <div className={styles.lighthouseLights}>
              <div className={`${styles.lightRightTop} ${styles.light}`} />
              <div className={`${styles.lightLeftMiddle} ${styles.light}`} />
            </div>
            <div className={styles.shootingStars} />
            <div className={`${styles.glowShineContainer} ${styles.layer}`} data-depth="0.1">
              <div className={`${styles.glowShine5} ${styles.shineCircle}`} />
              <div className={`${styles.glowShine4} ${styles.shineCircle}`} />
              <div className={`${styles.glowShine3} ${styles.shineCircle}`} />
              <div className={`${styles.glowShine1} ${styles.shineCircle}`} />
              <div className={`${styles.glowShine2} ${styles.shineCircle}`} />
            </div>
          </div>
        </div>
        <div className={styles.bottom}>
          <div className={styles.ocean}>
            <div className={`${styles.topTier1} ${styles.oceanLayer}`} />
            <div className={`${styles.topTier2} ${styles.oceanLayer}`} />
            <div className={`${styles.topTier3} ${styles.oceanLayer}`} />
            <div className={`${styles.topTier4} ${styles.oceanLayer}`} />
            <div className={`${styles.topTier5} ${styles.oceanLayer}`} />
          </div>
        </div>
        <div className={styles.aurinLogo}>
          <Image
            src="/aurinDark.png"
            alt="Aurin Logo"
            width={120}
            height={40}
            style={{ width: 'auto', height: 'auto' }}
          />
          <div className={styles.smallProgressBar}>
            <div className={styles.progressFill} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default LighthouseScene; 