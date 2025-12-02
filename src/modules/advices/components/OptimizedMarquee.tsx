'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, Timestamp, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { UserAvatar } from '@/modules/shared/components/atoms/Avatar/UserAvatar';
import { Small } from '@/components/ui/Typography';
import styles from './OptimizedMarquee.module.scss';
import type { Advice, OptimizedMarqueeProps } from '../types';

const OptimizedMarquee: React.FC<OptimizedMarqueeProps> = ({
  speed = 30,
  showTooltip = true,

  fontSize = "1rem",
  textColor = "",
  hoverColor = "#000000",
}) => {
  const { isSynced } = useAuth();
  const [advices, setAdvices] = useState<Advice[]>([]);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredAdvice, setHoveredAdvice] = useState<Advice | null>(null);
  const [rotation, setRotation] = useState(0);
  const maxRotation = 8;

  // Firebase data fetching - waits for Firebase Auth to be synced
  useEffect(() => {
    if (!isSynced) return;

    const q = query(collection(db, 'advices'), where('expiry', '>', Timestamp.now()));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const now = Timestamp.now();
      const activeAdvices: Advice[] = [];
      const expiredAdvices: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Partial<Advice>;
        const expiry = data.expiry as Timestamp | undefined;
        if (expiry && expiry.toMillis() > now.toMillis()) {
          activeAdvices.push({ id: doc.id, ...data, expiry } as Advice);
        } else {
          expiredAdvices.push(doc.id);
        }
      });

      // Eliminar anuncios expirados usando batch para operación atómica
      if (expiredAdvices.length > 0) {
        try {
          const batch = writeBatch(db);
          expiredAdvices.forEach((id) => {
            batch.delete(doc(db, 'advices', id));
          });
          await batch.commit();
          console.log(`Deleted ${expiredAdvices.length} expired advices:`, expiredAdvices);
        } catch (error) {
          console.error('Error deleting expired advices:', error);
        }
      }

      setAdvices(activeAdvices);
    }, (error) => {
      console.error('Error fetching advices:', error);
      setAdvices([]);
    });

    return () => unsubscribe();
  }, [isSynced]);

  // Mouse tracking for tooltip
  useEffect(() => {
    if (!showTooltip) return;

    const handleMouseMove = (e: MouseEvent) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });

      const midpoint = window.innerWidth / 2;
      const distanceFromMidpoint = Math.abs(e.clientX - midpoint);
      const rotation = (distanceFromMidpoint / midpoint) * maxRotation;

      setRotation(e.clientX > midpoint ? rotation : -rotation);
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [showTooltip]);

  if (advices.length === 0) return null;

  // Create single row content for seamless looping
  const marqueeContent = Array(15).fill(null).map((_, contentIndex) => (
    <span key={`content-${contentIndex}`} className={styles.marqueeContent}>
      {advices.map((advice, index) => (
        <span 
          key={`${advice.id}-${contentIndex}-${index}`} 
          className={styles.adviceItem}
          onMouseEnter={() => {
            setIsHovered(true);
            setHoveredAdvice(advice);
          }}
          onMouseLeave={() => {
            setIsHovered(false);
            setHoveredAdvice(null);
          }}
        >
          <UserAvatar 
            userId={advice.creatorId}
            userName={advice.creatorFirstName}
            size="sm"
            showStatus={false}
          />
          <Small className={styles.messageText}>{advice.message}</Small>
          {index < advices.length - 1 && <span className={styles.bullet}> • </span>}
        </span>
      ))}
    </span>
  ));

  return (
    <>
      {showTooltip && hoveredAdvice && (
        <div
          className={`${styles.followingTooltip} ${isHovered ? styles.visible : styles.hidden}`}
          style={{
            top: `${cursorPosition.y + 50}px`,
            left: `${cursorPosition.x}px`,
            transform: `rotateZ(${rotation}deg) translate(-50%, -50%)`,
          }}
        >
          <Small>{hoveredAdvice.creatorFirstName}</Small>
        </div>
      )}

      <section className={styles.marquee}>
        <motion.div
          className={styles.marqueeInner}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => {
            setIsHovered(false);
            setHoveredAdvice(null);
          }}
          animate={{
            x: [0, -2000],
          }}
          transition={{
            repeat: Infinity,
            duration: speed,
            ease: "linear",
          }}
        >
          <span
            className={styles.marqueeText}
            style={{
              fontSize,
              color: textColor || undefined,
            }}
          >
            <span className={styles.hoverableText}>{marqueeContent}</span>
            <style jsx>{`
              .${styles.hoverableText}:hover {
                color: ${hoverColor || "var(--tw-prose-links)"};
              }
            `}</style>
          </span>
        </motion.div>
      </section>
    </>
  );
};

export default OptimizedMarquee; 