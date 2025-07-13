"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { gsap } from "gsap";
import { ScrollToPlugin } from "gsap/ScrollToPlugin";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Wizard, WizardStep, WizardProgress, WizardActions } from "@/components/ui/wizard";
import SuccessAlert from "./SuccessAlert";
import FailAlert from "./FailAlert";
import styles from "./OnboardingStepper.module.scss";
import Image from "next/image";
import { useOnboardingStatus } from "@/hooks/useOnboardingStatus";

gsap.registerPlugin(ScrollToPlugin);

interface OnboardingStepperProps {
  onComplete?: () => void;
}

// Error Boundary Component for Lottie animations
const LottieErrorBoundary = ({ 
  children, 
  fallback, 
  onError 
}: { 
  children: React.ReactNode; 
  fallback: React.ReactNode; 
  onError: () => void;
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.message?.includes('ImageData') || event.message?.includes('canvas')) {
        console.error('[LottieErrorBoundary] Canvas/ImageData error caught:', event.message);
        setHasError(true);
        onError();
        event.preventDefault();
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason?.message?.includes('ImageData') || event.reason?.message?.includes('canvas')) {
        console.error('[LottieErrorBoundary] Promise rejection caught:', event.reason);
        setHasError(true);
        onError();
        event.preventDefault();
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [onError]);

  if (hasError) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

const OnboardingStepper = ({ onComplete }: OnboardingStepperProps) => {
  const { user } = useUser();
  const { isCompleted, currentStep, isLoading, error } = useOnboardingStatus();
  const [step, setStep] = useState(1);
  const [alerts, setAlerts] = useState<{ id: string; type: "success" | "failure"; message?: string; error?: string }[]>([]);
  const [lottieErrors, setLottieErrors] = useState<Set<number>>(new Set());
  const [loadingStates, setLoadingStates] = useState<Set<number>>(new Set());
  const stepperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const prevStepRef = useRef<number>(1);

  // Memoize shouldRender to prevent unnecessary re-renders
  const shouldRender = useMemo(() => {
    return !isCompleted && !isLoading && !!user;
  }, [isCompleted, isLoading, user]);

  // Update step when onboarding status changes
  useEffect(() => {
    if (!isLoading && !isCompleted) {
      setStep(currentStep);
    }
  }, [isLoading, isCompleted, currentStep]);

  // GSAP animation for stepper mount
  useEffect(() => {
    const stepper = stepperRef.current;
    if (stepper && shouldRender) {
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
  }, [shouldRender]);

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

  // Handle alerts with useCallback
  const addAlert = useCallback((type: "success" | "failure", message?: string, error?: string) => {
    const id = `${type}-${Date.now()}`;
    console.log(`[OnboardingStepper] Adding ${type} alert with ID:`, id);
    setAlerts((prev) => [...prev, { id, type, message, error }]);
  }, []);

  const removeAlert = useCallback((id: string) => {
    console.log("[OnboardingStepper] Removing alert with ID:", id);
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  }, []);

  // Handle step change with useCallback
  const handleStepChange = useCallback(async (newStep: number) => {
    if (!user?.id) {
      console.log("[OnboardingStepper] No user ID, skipping step change");
      return;
    }

    try {
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, { currentStep: newStep }, { merge: true });
      console.log("[OnboardingStepper] Step changed to:", newStep);
      setStep(newStep);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al cambiar de paso";
      console.error("[OnboardingStepper] Step change error:", message);
      addAlert("failure", "No se pudo cambiar de paso.", message);
    }
  }, [user?.id, addAlert]);

  // Handle completion with useCallback
  const handleComplete = useCallback(async () => {
    if (!user?.id) {
      console.log("[OnboardingStepper] No user ID, skipping completion");
      return;
    }

    try {
      // 1. Marcar como completado en Firestore
      const userDocRef = doc(db, "users", user.id);
      await setDoc(userDocRef, { 
        onboardingCompleted: true, 
        currentStep: 5 
      }, { merge: true });
      
      console.log("[OnboardingStepper] Onboarding completed in Firestore");

      // 2. Actualizar Clerk metadata para consistencia
      try {
        const response = await fetch('/api/update-user-metadata', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.id,
            metadata: {
              onboardingCompleted: true,
              currentStep: 5,
            },
          }),
        });

        if (response.ok) {
          console.log("[OnboardingStepper] Clerk metadata updated successfully");
        } else {
          console.warn("[OnboardingStepper] Failed to update Clerk metadata");
        }
      } catch (clerkError) {
        console.warn("[OnboardingStepper] Could not update Clerk metadata:", clerkError);
        // No es crítico, Firestore es la fuente de verdad
      }

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
            if (onComplete) {
              console.log("[OnboardingStepper] Triggering onComplete callback");
              onComplete();
            }
          },
        });
      } else {
        if (onComplete) {
          console.log("[OnboardingStepper] Triggering onComplete callback (no stepper)");
          onComplete();
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al completar el onboarding";
      console.error("[OnboardingStepper] Completion error:", message);
      addAlert("failure", "No se pudo completar el onboarding.", message);
    }
  }, [user?.id, addAlert, onComplete]);

  // Handle Lottie errors with useCallback
  const handleLottieError = useCallback((stepIndex: number, errorType = 'general') => {
    console.error(`[OnboardingStepper] Lottie error for step ${stepIndex}, type: ${errorType}`);
    setLottieErrors(prev => new Set(prev).add(stepIndex));
    setLoadingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepIndex);
      return newSet;
    });
  }, []);

  // Handle Lottie loading states with useCallback
  const handleLottieLoad = useCallback((stepIndex: number) => {
    console.log(`[OnboardingStepper] Lottie loaded successfully for step ${stepIndex}`);
    setLoadingStates(prev => {
      const newSet = new Set(prev);
      newSet.delete(stepIndex);
      return newSet;
    });
  }, []);

  const handleLottieLoadStart = useCallback((stepIndex: number) => {
    console.log(`[OnboardingStepper] Lottie loading started for step ${stepIndex}`);
    setLoadingStates(prev => new Set(prev).add(stepIndex));
  }, []);

  // Memoize step data to prevent recreation
  const stepData = useMemo(() => [
    {
      title: "🗂️ Crea y asigna tareas",
      lottieUrl: "https://lottie.host/76f2bdb2-5236-44f0-b671-9807f46f002b/FWf3sNMOue.lottie",
      fallbackImage: "/OnboardingStepper/Step2.png",
      size: { width: 216, height: 131 },
      content: (
        <>
          <span>
            Puedes crear tareas y asignarlas a quienes estén involucrados. Solo los miembros asignados podrán verlas, comentarlas y actualizarlas.
            <br />
          </span>
          <span className={styles.bold}>¡Así mantenemos cada proyecto claro y enfocado!</span>
        </>
      )
    },
    {
      title: "💬 Actualiza y comenta",
      lottieUrl: "https://lottie.host/5f30ab10-7ac1-49bc-b782-5fc339501f24/YKbwc7JaAR.lottie",
      fallbackImage: "/OnboardingStepper/Step3.png",
      size: { width: 233, height: 302 },
      content: (
        <>
          <span>
            Cada tarea tiene su propio chat para que el equipo pueda conversar directamente allí.
            <br />
          </span>
          <span className={styles.bold}>
            También puedes actualizar el estado de la tarea fácilmente desde los botones superiores.
          </span>
        </>
      )
    },
    {
      title: "⏱️ Registra tu tiempo",
      lottieUrl: "https://lottie.host/046bcd94-75d7-4bf7-82d0-fa00572def09/fnsqFVkOK2.lottie",
      fallbackImage: "/OnboardingStepper/Step4.png",
      size: { width: 285, height: 158 },
      content: (
        <>
          <span>
            ¿Quieres saber cuánto tiempo dedicas a una tarea?
            <br />
            Inicia un contador individual y lleva el control preciso de tu trabajo dentro del sistema.
            <br />
          </span>
          <span className={styles.bold}>Puedes detener el contador presionando el mismo botón, de nuevo.</span>
        </>
      )
    },
    {
      title: "🤝 Conecta con tu equipo y clientes",
      lottieUrl: "https://lottie.host/96a7bf25-61aa-4ac7-96b1-f1c647b838aa/qGDbAUWBU0.lottie",
      fallbackImage: "/OnboardingStepper/Step5.png",
      size: { width: 202, height: 177 },
      content: "Desde el panel de miembros podrás ver a todo tu equipo. También puedes crear cuentas de clientes para asociarlas con tareas."
    },
    {
      title: "⚙️ Configura tu cuenta",
      lottieUrl: "https://lottie.host/7f196621-55e8-41d9-b219-498b61255490/PlWoUWiTNW.lottie",
      fallbackImage: "/OnboardingStepper/Step5.png",
      size: { width: 220, height: 160 },
      content: (
        <>
          <span>
            Personaliza tu perfil y ajusta las preferencias de notificaciones en la configuración de cuenta.
            <br />
          </span>
          <span className={styles.bold}>¡Haz que la plataforma se adapte a tu estilo de trabajo!</span>
        </>
      )
    }
  ], []);

  // Safe Lottie Component with enhanced error handling
  const SafeLottieComponent = ({ stepIndex, data }: { 
    stepIndex: number; 
    data: {
      title: string;
      lottieUrl: string;
      fallbackImage: string;
      size: { width: number; height: number };
      content: React.ReactNode;
    }
  }) => {
    const [localError, setLocalError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
      // Set a timeout to fallback to image if Lottie takes too long to load
      const timeout = setTimeout(() => {
        if (!isLoaded && !localError) {
          console.warn(`[SafeLottieComponent] Step ${stepIndex} Lottie timeout, falling back to image`);
          setLocalError(true);
          handleLottieError(stepIndex, 'timeout');
        }
      }, 5000); // 5 second timeout

      return () => clearTimeout(timeout);
    }, [stepIndex, isLoaded, localError]);

    const handleError = useCallback(() => {
      console.error(`[SafeLottieComponent] Step ${stepIndex} Lottie error`);
      setLocalError(true);
      handleLottieError(stepIndex, 'render');
    }, [stepIndex]);

    const handleLoad = useCallback(() => {
      console.log(`[SafeLottieComponent] Step ${stepIndex} Lottie loaded`);
      setIsLoaded(true);
      handleLottieLoad(stepIndex);
    }, [stepIndex]);

    const handleLoadStart = useCallback(() => {
      console.log(`[SafeLottieComponent] Step ${stepIndex} Lottie load started`);
      handleLottieLoadStart(stepIndex);
    }, [stepIndex]);

    if (localError || lottieErrors.has(stepIndex)) {
      return (
        <Image
          src={data.fallbackImage}
          alt={`Step ${stepIndex + 1} illustration`}
          width={data.size.width}
          height={data.size.height}
          className={styles.stepImage}
          priority
        />
      );
    }

    return (
      <LottieErrorBoundary
        fallback={
          <Image
            src={data.fallbackImage}
            alt={`Step ${stepIndex + 1} illustration`}
            width={data.size.width}
            height={data.size.height}
            className={styles.stepImage}
            priority
          />
        }
        onError={handleError}
      >
        <div style={{ position: 'relative' }}>
          {loadingStates.has(stepIndex) && (
            <div 
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 1
              }}
            >
              <div>Cargando...</div>
            </div>
          )}
          <DotLottieReact
            src={data.lottieUrl}
            loop
            autoplay
            className={styles.stepImage}
            style={{
              ...data.size,
              opacity: isLoaded ? 1 : 0.5
            }}
            onLoad={handleLoad}
            onLoadStart={handleLoadStart}
            onError={handleError}
          />
        </div>
      </LottieErrorBoundary>
    );
  };

  // Render step content with useCallback
  const renderStepContent = useCallback((stepIndex: number) => {
    const data = stepData[stepIndex];

    return (
      <div ref={contentRef} className={styles.frame2147225879}>
        <div ref={cardRef} className={styles.card}>
          <div className={styles.creaYAsignaTareas}>{data.title}</div>
          <div className={styles.lottieWrapper}>
            <SafeLottieComponent stepIndex={stepIndex} data={data} />
          </div>
          <div className={styles.puedesCrearTareas}>
            {data.content}
          </div>
        </div>
      </div>
    );
  }, [stepData, SafeLottieComponent]);

  // Show loading state
  if (isLoading) {
    console.log("[OnboardingStepper] Loading onboarding status...");
    return null;
  }

  // Show error state
  if (error) {
    console.error("[OnboardingStepper] Error loading onboarding status:", error);
    return null;
  }

  // Don't render if onboarding is completed or no user
  if (!shouldRender) {
    console.log("[OnboardingStepper] Not rendering stepper:", {
      isCompleted,
      isLoading,
      hasUser: !!user
    });
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
            {renderStepContent(0)}
          </WizardStep>
          <WizardStep step={1}>
            {renderStepContent(1)}
          </WizardStep>
          <WizardStep step={2}>
            {renderStepContent(2)}
          </WizardStep>
          <WizardStep step={3}>
            {renderStepContent(3)}
          </WizardStep>
          <WizardStep step={4}>
            {renderStepContent(4)}
          </WizardStep>
          <WizardActions
            onComplete={handleComplete}
            nextStep={() => handleStepChange(step + 1)}
            prevStep={() => handleStepChange(step - 1)}
          />
        </Wizard>
      </div>
    </div>
  );
};

OnboardingStepper.displayName = 'OnboardingStepper';

export default OnboardingStepper;
