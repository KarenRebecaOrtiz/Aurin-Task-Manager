"use client";

import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import SuccessAlert from "./SuccessAlert";
import FailAlert from "./FailAlert";
import styles from "./OnboardingStepper.module.scss";


gsap.registerPlugin(ScrollToPlugin);

interface OnboardingStepperProps {
  onComplete?: () => void; 
}

const OnboardingStepper = ({ onComplete }: OnboardingStepperProps) => {
  const { user } = useUser();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<{ id: string; type: "success" | "failure"; message?: string; error?: string }[]>([]);
  const stepperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number>(1); // Track previous step for animation direction
  const renderCountRef = useRef<number>(0);

  useEffect(() => {
    renderCountRef.current += 1;
    console.log("[OnboardingStepper] Component rendered, count:", renderCountRef.current);
  });

  // Fetch user onboarding status
  useEffect(() => {
    if (!user) {
      console.log("[OnboardingStepper] No user, skipping fetch");
      return;
    }

    const userDocRef = doc(db, "users", user.id);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const onboardingCompleted = data.onboardingCompleted ?? false;
          console.log("[OnboardingStepper] User data fetched, onboardingCompleted:", onboardingCompleted);
          setIsOpen(!onboardingCompleted);
          if (!onboardingCompleted) {
            setStep(data.currentStep || 1);
          }
        } else {
          console.log("[OnboardingStepper] No user document, showing stepper");
          setIsOpen(true);
        }
      },
      (err) => {
        console.error("[OnboardingStepper] Error fetching user data:", err);
        setError("Error al cargar datos del usuario.");
      }
    );

    return () => unsubscribe();
  }, [user]);

  // GSAP animation for stepper mount
  useEffect(() => {
    const stepper = stepperRef.current;
    if (stepper && isOpen) {
      console.log("[OnboardingStepper] Applying GSAP mount animation");
      gsap.fromTo(
        stepper,
        { opacity: 0, scale: 0.9, y: 50 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.6,
          ease: "power3.out",
          onComplete: () => console.log("[OnboardingStepper] Mount animation completed"),
        }
      );
    }
  }, [isOpen]);

  // GSAP animation for step transitions
  useEffect(() => {
    const card = cardRef.current;
    if (card && contentRef.current) {
      const direction = step > prevStepRef.current ? 1 : -1; // 1 for next, -1 for prev
      console.log("[OnboardingStepper] Applying GSAP step transition, step:", step, "direction:", direction);

      // Exit animation for current card
      gsap.to(card, {
        opacity: 0,
        x: -50 * direction,
        scale: 0.95,
        duration: 0.3,
        ease: "power2.in",
        onComplete: () => {
          // Reset position for new card
          gsap.set(card, { x: 50 * direction, scale: 0.95 });
          // Enter animation for new card
          gsap.to(card, {
            opacity: 1,
            x: 0,
            scale: 1,
            duration: 0.4,
            ease: "power2.out",
            onStart: () => console.log("[OnboardingStepper] Step enter animation started"),
            onComplete: () => console.log("[OnboardingStepper] Step enter animation completed"),
          });
          // Scroll to top
          gsap.to(window, { scrollTo: 0, duration: 0.5, ease: "power2.out" });
        },
      });
    }
    prevStepRef.current = step; // Update previous step
  }, [step]);

  // Handle alerts
  const addAlert = (type: "success" | "failure", message?: string, error?: string) => {
    const id = `${type}-${Date.now()}`;
    console.log(`[OnboardingStepper] Adding ${type} alert with ID:`, id);
    setAlerts((prev) => [...prev, { id, type, message, error }]);
  };

  const removeAlert = (id: string) => {
    console.log("[OnboardingStepper] Removing alert with ID:", id);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  // Handle step change
  const handleStepChange = async (newStep: number) => {
    if (!user?.id) {
      console.log("[OnboardingStepper] No user ID, skipping step change");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, { currentStep: newStep }, { merge: true });
      console.log("[OnboardingStepper] Step changed to:", newStep);
      setStep(newStep);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar de paso";
      console.error("[OnboardingStepper] Step change error:", message);
      setError(message);
      addAlert("failure", "No se pudo cambiar de paso.", message);
    } finally {
      setLoading(false);
    }
  };

  // Handle completion
  const handleComplete = async () => {
    if (!user?.id) {
      console.log("[OnboardingStepper] No user ID, skipping completion");
      return;
    }

    setLoading(true);
    try {
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, { onboardingCompleted: true, currentStep: 5 }, { merge: true });
      console.log("[OnboardingStepper] Onboarding completed, set onboardingCompleted: true");
      addAlert("success", "¡Onboarding completado! Bienvenido a la plataforma.");
      const stepper = stepperRef.current;
      if (stepper) {
        gsap.to(stepper, {
          opacity: 0,
          scale: 0.9,
          y: 50,
          duration: 0.6,
          ease: "power3.in",
          onComplete: () => {
            console.log("[OnboardingStepper] Stepper closed");
            setIsOpen(false);
            if (onComplete) {
              console.log("[OnboardingStepper] Triggering onComplete callback");
              onComplete(); 
            }
          },
        });
      } else {
        setIsOpen(false);
        if (onComplete) {
          console.log("[OnboardingStepper] Triggering onComplete callback (no stepper)");
          onComplete(); 
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al completar el onboarding";
      console.error("[OnboardingStepper] Completion error:", message);
      setError(message);
      addAlert("failure", "No se pudo completar el onboarding.", message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !user) {
    console.log("[OnboardingStepper] Not rendering stepper, isOpen:", isOpen, "user:", !!user);
    return null;
  }

  return (
    <div className={styles.overlay}>
      {alerts.map((alert) =>
        alert.type === "success" ? (
          <SuccessAlert
            key={alert.id}
            message={alert.message || ""}
            onClose={() => removeAlert(alert.id)}
          />
        ) : (
          <FailAlert
            key={alert.id}
            message={alert.message || ""}
            error={alert.error || ""}
            onClose={() => removeAlert(alert.id)}
          />
        )
      )}
      <div ref={stepperRef} className={styles.frame2147225831}>
        <Wizard totalSteps={5}>
          <WizardProgress />
          <WizardStep step={0}>
            <div ref={contentRef} className={styles.frame2147225879}>
              <div ref={cardRef} className={styles.card}>
                <div className={styles.creaYAsignaTareas}>🗂️ Crea y asigna tareas</div>
                <div className={styles.lottieWrapper}>
                  <DotLottieReact
                    src="https://lottie.host/76f2bdb2-5236-44f0-b671-9807f46f002b/FWf3sNMOue.lottie"
                    loop
                    autoplay
                    className={styles.stepImage}
                    style={{ width: 216, height: 131 }}
                  />
                </div>
                <div className={styles.puedesCrearTareas}>
                  <span>
                    Puedes crear tareas y asignarlas a quienes estén involucrados. Solo los miembros asignados podrán verlas, comentarlas y actualizarlas.
                    <br />
                  </span>
                  <span className={styles.bold}>¡Así mantenemos cada proyecto claro y enfocado!</span>
                </div>
              </div>
            </div>
          </WizardStep>
          <WizardStep step={1}>
            <div ref={contentRef} className={styles.frame2147225879}>
              <div ref={cardRef} className={styles.card}>
                <div className={styles.actualizaYComenta}>💬 Actualiza y comenta</div>
                <div className={styles.lottieWrapper}>
                  <DotLottieReact
                    src="https://lottie.host/5f30ab10-7ac1-49bc-b782-5fc339501f24/YKbwc7JaAR.lottie"
                    loop
                    autoplay
                    className={styles.stepImage}
                    style={{ width: 233, height: 302 }}
                  />
                </div>
                <div className={styles.cadaTareaTiene}>
                  <span>
                    Cada tarea tiene su propio chat para que el equipo pueda conversar directamente allí.
                    <br />
                  </span>
                  <span className={styles.bold}>
                    También puedes actualizar el estado de la tarea fácilmente desde los botones superiores.
                  </span>
                </div>
              </div>
            </div>
          </WizardStep>
          <WizardStep step={2}>
            <div ref={contentRef} className={styles.frame2147225879}>
              <div ref={cardRef} className={styles.card}>
                <div className={styles.registraTuTiempo}>⏱️ Registra tu tiempo</div>
                <div className={styles.lottieWrapper}>
                  <DotLottieReact
                    src="https://lottie.host/046bcd94-75d7-4bf7-82d0-fa00572def09/fnsqFVkOK2.lottie"
                    loop
                    autoplay
                    className={styles.stepImage}
                    style={{ width: 285, height: 158 }}
                  />
                </div>
                <div className={styles.quieresSaber}>
                  <span>
                    ¿Quieres saber cuánto tiempo dedicas a una tarea?
                    <br />
                    Inicia un contador individual y lleva el control preciso de tu trabajo dentro del sistema.
                    <br />
                  </span>
                  <span className={styles.bold}>Puedes detener el contador presionando el mismo botón, de nuevo.</span>
                </div>
              </div>
            </div>
          </WizardStep>
          <WizardStep step={3}>
            <div ref={contentRef} className={styles.frame2147225879}>
              <div ref={cardRef} className={styles.card}>
                <div className={styles.conectaConTuEquipo}>🤝 Conecta con tu equipo y clientes</div>
                <div className={styles.lottieWrapper}>
                  <DotLottieReact
                    src="https://lottie.host/96a7bf25-61aa-4ac7-96b1-f1c647b838aa/qGDbAUWBU0.lottie"
                    loop
                    autoplay
                    className={styles.stepImage}
                    style={{ width: 202, height: 177 }}
                  />
                </div>
                <div className={styles.desdeElPanel}>
                  Desde el panel de miembros podrás ver a todo tu equipo. También puedes crear cuentas de clientes para asociarlas con tareas.
                </div>
              </div>
            </div>
          </WizardStep>
          <WizardStep step={4}>
            <div ref={contentRef} className={styles.frame2147225879}>
              <div ref={cardRef} className={styles.card}>
                <div className={styles.conectaConTuEquipo}>⚙️ Configura tu cuenta</div>
                <div className={styles.lottieWrapper}>
                  <DotLottieReact
                    src="https://lottie.host/7f196621-55e8-41d9-b219-498b61255490/PlWoUWiTNW.lottie"
                    loop
                    autoplay
                    className={styles.stepImage}
                    style={{ width: 220, height: 160 }}
                  />
                </div>
                <div className={styles.desdeElPanel}>
                  <span>
                    Personaliza tu perfil y ajusta las preferencias de notificaciones en la configuración de cuenta.
                    <br />
                  </span>
                  <span className={styles.bold}>¡Haz que la plataforma se adapte a tu estilo de trabajo!</span>
                </div>
              </div>
            </div>
          </WizardStep>
          <WizardActions
            onComplete={handleComplete}
            nextStep={() => handleStepChange(step + 1)}
            prevStep={() => handleStepChange(step - 1)}
          />
        </Wizard>
        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
};

export default OnboardingStepper;