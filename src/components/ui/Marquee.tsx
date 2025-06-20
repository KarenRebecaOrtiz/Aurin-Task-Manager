'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, deleteDoc, doc, Timestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './Marquee.module.scss';

interface Advice {
  id: string;
  message: string;
  creatorFirstName: string;
  expiry: Timestamp;
}

const Marquee: React.FC = () => {
  const [advices, setAdvices] = useState<Advice[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'advices'), where('expiry', '>', Timestamp.now()));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const now = Timestamp.now();
      const activeAdvices: Advice[] = [];
      const expiredAdvices: string[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data() as Partial<Advice>; // Allow partial data
        const expiry = data.expiry as Timestamp | undefined;
        if (expiry && expiry.toMillis() > now.toMillis()) {
          activeAdvices.push({ id: doc.id, ...data, expiry } as Advice);
        } else {
          expiredAdvices.push(doc.id);
        }
      });

      // Delete expired announcements
      expiredAdvices.forEach(async (id) => {
        try {
          await deleteDoc(doc(db, 'advices', id));
        } catch (error) {
          console.error('Error deleting expired advice:', error);
        }
      });

      setAdvices(activeAdvices);
    }, (error) => {
      console.error('Error fetching advices:', error);
      setAdvices([]);
    });

    return () => unsubscribe();
  }, []);

  if (advices.length === 0) return null;

  return (
    <div className={styles.marquee}>
      <div className={styles.marqueeContent}>
        {advices.map((advice, index) => (
          <span key={advice.id} className={styles.adviceItem}>
            {advice.creatorFirstName}: {advice.message}
            {index < advices.length - 1 && <span className={styles.bullet}> • </span>}
          </span>
        ))}
        {/* Duplicate content for infinite scroll */}
        {advices.map((advice, index) => (
          <span key={`${advice.id}-duplicate`} className={styles.adviceItem}>
            {advice.creatorFirstName}: {advice.message}
            {index < advices.length - 1 && <span className={styles.bullet}> • </span>}
          </span>
        ))}
      </div>
    </div>
  );
};

export default Marquee;