'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, onSnapshot, doc, Timestamp, query, where, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './Marquee.module.scss';
import gsap from 'gsap';

interface Advice {
  id: string;
  message: string;
  creatorFirstName: string;
  expiry: Timestamp;
}

const Marquee: React.FC = () => {
  const [advices, setAdvices] = useState<Advice[]>([]);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);

  // Firebase data fetching
  useEffect(() => {
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
  }, []);

  // GSAP animation
  useEffect(() => {
    if (!marqueeInnerRef.current || advices.length === 0) return;

    const tween = gsap.to(`.${styles.marqueePart}`, {
      xPercent: 200, // Mueve de derecha a izquierda
      repeat: -1,
      duration: 20, // Increased from 10 to 20 seconds to make it slower
      ease: 'linear',
    }).totalProgress(0.5);

    gsap.set(marqueeInnerRef.current, { xPercent: -50 });

    return () => {
      tween.kill();
    };
  }, [advices]);

  if (advices.length === 0) return null;

  // Create multiple parts for seamless looping
  const renderMarqueeParts = () => {
    const parts = [];
    for (let i = 0; i < 25; i++) {
      parts.push(
        <div key={`part-${i}`} className={styles.marqueePart}>
          {advices.map((advice, index) => (
            <span key={`${advice.id}-${i}-${index}`} className={styles.adviceItem}>
              {advice.creatorFirstName}: {advice.message}
              {index < advices.length - 1 && <span className={styles.bullet}> • </span>}
            </span>
          ))}
        </div>
      );
    }
    return parts;
  };

  return (
    <section className={styles.marquee}>
      <div className={styles.marqueeInner} ref={marqueeInnerRef} aria-hidden="true">
        {renderMarqueeParts()}
      </div>
    </section>
  );
};

export default Marquee;