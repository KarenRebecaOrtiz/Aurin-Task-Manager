"use client";

import * as React from "react";
import { useState, useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import { gsap } from "gsap";
import styles from "./wizard.module.scss";

interface WizardProps {
  totalSteps: number;
  children: React.ReactNode;
}

interface WizardStepChildProps {
  currentStep?: number;
  registerValidator?: (step: number, validator: () => Promise<boolean>) => void;
  direction?: "next" | "prev" | null;
}

interface WizardProgressChildProps {
  currentStep?: number;
  completedSteps?: number[];
  goToStep?: (step: number) => void;
  totalSteps?: number;
}

interface WizardActionsChildProps {
  currentStep?: number;
  totalSteps?: number;
  nextStep?: () => void;
  prevStep?: () => void;
}

const Wizard: React.FC<WizardProps> = ({ totalSteps, children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [validators, setValidators] = useState<(() => Promise<boolean>)[]>([]);
  const [direction, setDirection] = useState<"next" | "prev" | null>(null);
  const wizardContainerRef = useRef<HTMLDivElement>(null);

  const registerValidator = useRef((step: number, validator: () => Promise<boolean>) => {
    setValidators((prev) => {
      const newValidators = [...prev];
      newValidators[step] = validator;
      return newValidators;
    });
  }).current;

  const nextStep = useCallback(async () => {
    const validator = validators[currentStep];
    if (validator) {
      const isValid = await validator();
      if (!isValid) return;
    }
    if (currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setDirection("next");
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, validators]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      setDirection("prev");
      setCurrentStep(currentStep - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback(
    async (step: number) => {
      if (step <= completedSteps.length) {
        const validator = validators[currentStep];
        if (validator) {
          const isValid = await validator();
          if (!isValid) return;
        }
        setDirection(step > currentStep ? "next" : "prev");
        setCurrentStep(step);
      }
    },
    [completedSteps, currentStep, validators],
  );

  useEffect(() => {
    if (wizardContainerRef.current) {
      wizardContainerRef.current.setAttribute("data-current-step", currentStep.toString());
    }
  }, [currentStep]);

  return (
    <div className={styles.wizardContainer} ref={wizardContainerRef} data-current-step={currentStep}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === WizardStep) {
            return React.cloneElement(child as React.ReactElement<WizardStepChildProps>, {
              currentStep,
              registerValidator,
              direction,
            });
          } else if (child.type === WizardProgress) {
            return React.cloneElement(child as React.ReactElement<WizardProgressChildProps>, {
              currentStep,
              completedSteps,
              goToStep,
              totalSteps,
            });
          } else if (child.type === WizardActions) {
            return React.cloneElement(child as React.ReactElement<WizardActionsChildProps>, {
              currentStep,
              totalSteps,
              nextStep,
              prevStep,
            });
          }
          return child;
        }
        return child;
      })}
    </div>
  );
};

interface WizardStepProps {
  step: number;
  children: React.ReactNode;
  validator?: () => Promise<boolean>;
  currentStep?: number;
  registerValidator?: (step: number, validator: () => Promise<boolean>) => void;
  direction?: "next" | "prev" | null;
}

const WizardStep: React.FC<WizardStepProps> = ({ step, children, validator, currentStep, registerValidator, direction }) => {
  const stepRef = useRef<HTMLDivElement>(null);
  const hasRegisteredValidator = useRef(false);

  useEffect(() => {
    if (validator && registerValidator && !hasRegisteredValidator.current) {
      registerValidator(step, validator);
      hasRegisteredValidator.current = true;
    }
  }, [step, validator, registerValidator]);

  // Reset the registration flag when the step changes
  useEffect(() => {
    hasRegisteredValidator.current = false;
  }, [step]);

  useEffect(() => {
    if (stepRef.current && currentStep === step) {
      const fromX = direction === "next" ? 50 : direction === "prev" ? -50 : 0;
      gsap.fromTo(
        stepRef.current,
        { opacity: 0, x: fromX },
        { opacity: 1, x: 0, duration: 0.3, ease: "power2.out" }
      );
    }
  }, [currentStep, step, direction]);

  if (currentStep !== step) {
    return null;
  }

  return (
    <div className={styles.wizardStep} ref={stepRef}>
      {children}
    </div>
  );
};

interface WizardProgressProps {
  currentStep?: number;
  completedSteps?: number[];
  goToStep?: (step: number) => void;
  totalSteps?: number;
}

const WizardProgress: React.FC<WizardProgressProps> = ({ currentStep = 0, completedSteps = [], goToStep, totalSteps = 5 }) => {
  return (
    <div className={styles.wizardProgress}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <button
          key={index}
          type="button"
          className={`${styles.wizardProgressDot} ${index === currentStep ? styles.active : ""} ${
            completedSteps.includes(index) ? styles.completed : ""
          }`}
          onClick={() => goToStep && goToStep(index)}
          aria-label={`Ir al paso ${index + 1}`}
        />
      ))}
    </div>
  );
};

interface WizardActionsProps {
  currentStep?: number;
  totalSteps?: number;
  nextStep?: () => void;
  prevStep?: () => void;
  onComplete?: () => void;
}

const WizardActions: React.FC<WizardActionsProps> = ({ currentStep = 0, totalSteps = 5, nextStep, prevStep, onComplete }) => {
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className={styles.wizardButtons}>
      {!isFirstStep && (
        <button type="button" className={styles.wizardButton} onClick={prevStep}>
          <Image src="/chevron-left.svg" alt="Anterior" width={16} height={16} />
          Anterior
        </button>
      )}
      <div style={{ flex: 1 }} />
      {isLastStep ? (
        <button type="button" className={styles.wizardButton} onClick={onComplete}>
          <Image src="/check-check.svg" alt="Completar" width={16} height={16} />
          Completar
        </button>
      ) : (
        <button type="button" className={styles.wizardButton} onClick={nextStep}>
          Siguiente
          <Image src="/chevron-right.svg" alt="Siguiente" width={16} height={16} />
        </button>
      )}
    </div>
  );
};

export { Wizard, WizardStep, WizardProgress, WizardActions };
