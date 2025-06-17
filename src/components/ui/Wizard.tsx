"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import styles from "./wizard.module.scss";

interface WizardProps {
  totalSteps: number;
  children: React.ReactNode;
}

const Wizard: React.FC<WizardProps> = ({ totalSteps, children }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [validators, setValidators] = useState<(() => Promise<boolean>)[]>([]);

  const registerValidator = useCallback((step: number, validator: () => Promise<boolean>) => {
    setValidators((prev) => {
      const newValidators = [...prev];
      newValidators[step] = validator;
      return newValidators;
    });
  }, []);

  const nextStep = useCallback(async () => {
    const validator = validators[currentStep];
    if (validator) {
      const isValid = await validator();
      if (!isValid) return;
    }
    if (currentStep < totalSteps - 1) {
      setCompletedSteps((prev) => [...new Set([...prev, currentStep])]);
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep, totalSteps, validators]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
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
        setCurrentStep(step);
      }
    },
    [completedSteps, currentStep, validators],
  );

  useEffect(() => {
    const wizardContainer = document.querySelector(`.${styles.wizardContainer}`);
    if (wizardContainer) {
      wizardContainer.setAttribute("data-current-step", currentStep.toString());
    }
  }, [currentStep]);

  return (
    <div className={styles.wizardContainer} data-current-step={currentStep}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === WizardStep) {
            return React.cloneElement(child as React.ReactElement<any>, {
              currentStep,
              registerValidator,
            });
          } else if (child.type === WizardProgress) {
            return React.cloneElement(child as React.ReactElement<any>, {
              currentStep,
              completedSteps,
              goToStep,
              totalSteps,
            });
          } else if (child.type === WizardButtons) {
            return React.cloneElement(child as React.ReactElement<any>, {
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
}

const WizardStep: React.FC<WizardStepProps> = ({ step, children, validator, currentStep, registerValidator }) => {
  useEffect(() => {
    if (validator && registerValidator) {
      registerValidator(step, validator);
    }
  }, [step, validator, registerValidator]);

  if (currentStep !== step) {
    return null;
  }

  return <div className={styles.wizardStep}>{children}</div>;
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

interface WizardButtonsProps {
  currentStep?: number;
  totalSteps?: number;
  nextStep?: () => void;
  prevStep?: () => void;
  onComplete?: () => void;
}

const WizardButtons: React.FC<WizardButtonsProps> = ({ currentStep = 0, totalSteps = 5, nextStep, prevStep, onComplete }) => {
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
          <Image src="/check.svg" alt="Completar" width={16} height={16} />
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

export { Wizard, WizardStep, WizardProgress, WizardButtons };