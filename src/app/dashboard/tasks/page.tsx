'use client';
import { useState, useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Header from '@/components/ui/Header';
import SyncUserToFirestore from '@/components/SyncUserToFirestore';
import OnboardingStepper from '@/components/OnboardingStepper';
import Selector from '@/components/Selector';
import MembersTable from '@/components/MembersTable';
import styles from '@/components/Table.module.scss';

export default function TasksPage() {
  const [selectedContainer, setSelectedContainer] = useState<'tareas' | 'proyectos' | 'cuentas' | 'miembros'>('miembros');
  const contentRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(
      [headerRef.current, selectorRef.current, contentRef.current],
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.5, stagger: 0.1, ease: 'power2.out' }
    );

    return () => {
      gsap.killTweensOf([headerRef.current, selectorRef.current, contentRef.current]);
    };
  }, []);

  useEffect(() => {
    if (contentRef.current) {
      gsap.fromTo(
        contentRef.current,
        { opacity: 0, x: 10 },
        { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' }
      );
    }
  }, [selectedContainer]);

  return (
    <div className={styles.container}>
      <SyncUserToFirestore />
      <div ref={headerRef}>
        <Header selectedContainer={selectedContainer} />
      </div>
      <OnboardingStepper />
      <div ref={selectorRef} className={styles.selector}>
        <Selector selectedContainer={selectedContainer} setSelectedContainer={setSelectedContainer} />
      </div>
      <div ref={contentRef} className={styles.content}>
        {selectedContainer === 'tareas' && <div>Tareas (próximamente)</div>}
        {selectedContainer === 'proyectos' && <div>Aquí puedes gestionar los proyectos asignados a cada cuenta</div>}
        {selectedContainer === 'cuentas' && <div>Cuentas (próximamente)</div>}
        {selectedContainer === 'miembros' && <MembersTable />}
      </div>
    </div>
  );
}