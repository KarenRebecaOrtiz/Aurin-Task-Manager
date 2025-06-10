'use client';
import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { gsap } from 'gsap';
import styles from './OnboardingStepper.module.scss';

const OnboardingStepper = () => {
  const { user } = useUser();
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stepperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stepper = stepperRef.current;
    const content = contentRef.current;
    if (user && !user.publicMetadata?.onboardingCompleted) {
      setIsOpen(true);
      if (user.publicMetadata?.role) {
        setRole(user.publicMetadata.role as string);
      }
      if (user.publicMetadata?.description) {
        setDescription(user.publicMetadata.description as string);
      }
      if (user.publicMetadata?.currentStep) {
        setStep(user.publicMetadata.currentStep as number);
      }
      if (stepper) {
        gsap.fromTo(
          stepper,
          { opacity: 0, scale: 0.8 },
          { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
        );
      }
    }
    return () => {
      if (stepper) gsap.killTweensOf(stepper);
      if (content) gsap.killTweensOf(content);
    };
  }, [user]);

  const updateStep = async (newStep: number) => {
    if (!user || newStep < 1 || newStep > 5) return;

    setLoading(true);
    try {
      const response = await fetch('/api/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentStep: newStep }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update step');

      const content = contentRef.current;
      if (content) {
        gsap.to(content, {
          opacity: 0,
          scale: 0.95,
          duration: 0.3,
          ease: 'power2.in',
          onComplete: () => {
            setStep(newStep);
            gsap.fromTo(
              content,
              { opacity: 0, scale: 0.95 },
              { opacity: 1, scale: 1, duration: 0.3, ease: 'power2.out' }
            );
          },
        });
      } else {
        setStep(newStep);
      }

      await user.reload();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cambiar de paso';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, role, description }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update role');

      await user.reload();
      await updateStep(2);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al guardar el rol y descripción';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (step < 5) {
      await updateStep(step + 1);
    } else {
      try {
        setLoading(true);
        const response = await fetch('/api/update-role', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: user?.id, onboardingCompleted: true }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Failed to complete onboarding');

        const stepper = stepperRef.current;
        if (stepper) {
          gsap.to(stepper, {
            opacity: 0,
            scale: 0.8,
            duration: 0.5,
            ease: 'power2.in',
            onComplete: () => setIsOpen(false),
          });
        } else {
          setIsOpen(false);
        }

        await user?.reload();
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Error al completar el onboarding';
        setError(message);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!isOpen || !user) return null;

  const userName = user.firstName || 'Usuario';
  const avatarUrl = user.imageUrl || '/default-avatar.png';

  const renderStepIndicator = () => (
    <div className={styles.frame7}>
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          className={step === num ? styles.frame2147225883 : styles.frame2147225882}
          onClick={() => updateStep(num)}
          disabled={loading}
        >
          <div className={styles.stepNumber}>{num}</div>
        </button>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <div className={styles.frame2147225879}>
              {renderStepIndicator()}
              <div className={styles.frame3}>
                <div className={styles.holaNombreDeUsuario}>
                  ¡Hola, {userName}! 👋
                </div>
                <div className={styles.antesDeComenzar}>
                  <span>
                    Antes de comenzar, dinos qué rol tienes en el equipo.<br />
                  </span>
                  <span className={styles.bold}>
                    Esto nos ayuda a personalizar tu experiencia y a que cada quien pueda colaborar donde más valor aporta.
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.frame2147225878}>
              <div className={styles.avatar}>
                <Image
                  src={avatarUrl}
                  alt={userName}
                  width={86}
                  height={86}
                  style={{ borderRadius: '9999px', objectFit: 'cover' }}
                />
              </div>
              <div className={styles.frame24}>
                <div className={styles.sioUsername}>
                  <div className={styles.username}>¿Cuál es tu rol en el equipo?</div>
                  <input
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    placeholder="Dev, Diseñadora, PM, Líder de producto…"
                    className={styles.input}
                    disabled={loading}
                  />
                </div>
                <div className={styles.sioUsername}>
                  <div className={styles.username}>Descripción breve</div>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe tu perfil o experiencia…"
                    className={styles.input}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button
                type="submit"
                className={styles.continuar}
                disabled={loading || !role || !description}
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div className={styles.frame2147225879}>
              {renderStepIndicator()}
              <div className={styles.frame3}>
                <div className={styles.creaYAsignaTareas}>
                  🗂️ Crea y asigna tareas
                </div>
                <Image
                  src="/OnboardingStepper/Step2.png"
                  alt="Step 2"
                  width={216}
                  height={131}
                  className={styles.stepImage}
                />
                <div className={styles.puedesCrearTareas}>
                  <span>
                    Puedes crear tareas y asignarlas a quienes estén involucrados. Solo los miembros asignados podrán verlas, comentarlas y actualizarlas.<br />
                  </span>
                  <span className={styles.bold}>
                    ¡Así mantenemos cada proyecto claro y enfocado!
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button
                type="button"
                className={styles.continuar}
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div className={styles.frame2147225879}>
              {renderStepIndicator()}
              <div className={styles.frame3}>
                <div className={styles.actualizaYComenta}>
                  💬 Actualiza y comenta
                </div>
                <Image
                  src="/OnboardingStepper/Step3.png"
                  alt="Step 3"
                  width={233}
                  height={302}
                  className={styles.stepImage}
                />
                <div className={styles.cadaTareaTiene}>
                  <span>
                    Cada tarea tiene su propio chat para que el equipo pueda conversar directamente allí.<br />
                  </span>
                  <span className={styles.bold}>
                    También puedes actualizar el estado de la tarea fácilmente desde los botones superiores.
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button
                type="button"
                className={styles.continuar}
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </>
        );
      case 4:
        return (
          <>
            <div className={styles.frame2147225879}>
              {renderStepIndicator()}
              <div className={styles.frame3}>
                <div className={styles.registraTuTiempo}>
                  ⏱️ Registra tu tiempo
                </div>
                <Image
                  src="/OnboardingStepper/Step4.png"
                  alt="Step 4"
                  width={285}
                  height={158}
                  className={styles.stepImage}
                />
                <div className={styles.quieresSaber}>
                  <span>
                    ¿Quieres saber cuánto tiempo dedicas a una tarea?<br />
                    Inicia un contador individual y lleva el control preciso de tu trabajo dentro del sistema.<br />
                  </span>
                  <span className={styles.bold}>
                    Puedes detener el contador presionando el mismo botón, de nuevo.
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button
                type="button"
                className={styles.continuar}
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Guardando...' : 'Continuar'}
              </button>
            </div>
          </>
        );
      case 5:
        return (
          <>
            <div className={styles.frame2147225879}>
              {renderStepIndicator()}
              <div className={styles.frame3}>
                <div className={styles.conectaConTuEquipo}>
                  🤝 Conecta con tu equipo y clientes
                </div>
                <Image
                  src="/OnboardingStepper/Step5.png"
                  alt="Step 5"
                  width={202}
                  height={177}
                  className={styles.stepImage}
                />
                <div className={styles.desdeElPanel}>
                  Desde el panel de miembros podrás ver a todo tu equipo. También puedes crear cuentas de clientes para asociarlas con tareas.
                </div>
              </div>
            </div>
            <div className={styles.frame1000005615}>
              <button
                type="button"
                className={styles.continuar}
                onClick={handleNext}
                disabled={loading}
              >
                {loading ? 'Guardando...' : '¡Vamos Allá! 🚀'}
              </button>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.overlay}>
      <form onSubmit={step === 1 ? handleSubmit : undefined}>
        <div ref={stepperRef} className={styles.frame2147225831}>
          <div ref={contentRef}>{renderStepContent()}</div>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      </form>
    </div>
  );
};

export default OnboardingStepper;