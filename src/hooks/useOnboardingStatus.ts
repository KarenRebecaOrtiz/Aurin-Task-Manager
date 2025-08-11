import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OnboardingStatus {
  isCompleted: boolean;
  currentStep: number;
  isLoading: boolean;
  error: string | null;
}

export const useOnboardingStatus = () => {
  const { user } = useUser();
  const [status, setStatus] = useState<OnboardingStatus>({
    isCompleted: false,
    currentStep: 1,
    isLoading: true,
    error: null,
  });

  const checkOnboardingStatus = useCallback(async () => {
    if (!user?.id) {
      setStatus({
        isCompleted: false,
        currentStep: 1,
        isLoading: false,
        error: null,
      });
      return;
    }

    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }));

      // First check Clerk metadata (faster)
      const clerkOnboardingCompleted = user.publicMetadata?.onboardingCompleted as boolean;
      const clerkCurrentStep = user.publicMetadata?.currentStep as number;
      
      if (clerkOnboardingCompleted) {
        setStatus({
          isCompleted: true,
          currentStep: clerkCurrentStep || 5,
          isLoading: false,
          error: null,
        });
        return;
      }

      // If not completed in Clerk, check Firestore
      const userDocRef = doc(db, 'users', user.id);
      
      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const firestoreOnboardingCompleted = data.onboardingCompleted ?? false;
            const firestoreCurrentStep = data.currentStep || 1;
            
            // If Firestore shows completed but Clerk doesn't, sync to Clerk
            if (firestoreOnboardingCompleted && !clerkOnboardingCompleted) {
              // This would trigger a sync to Clerk (handled by SyncUserToFirestore)
            }
            
            setStatus({
              isCompleted: firestoreOnboardingCompleted,
              currentStep: firestoreCurrentStep,
              isLoading: false,
              error: null,
            });
          } else {
            // No user document, onboarding not started
            setStatus({
              isCompleted: false,
              currentStep: 1,
              isLoading: false,
              error: null,
            });
          }
        },
        () => {
          // Silently handle error
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'Error al cargar estado de onboarding',
          }));
        }
      );

      return unsubscribe;
    } catch {
      // Silently handle error
      setStatus({
        isCompleted: false,
        currentStep: 1,
        isLoading: false,
        error: 'Error al verificar estado de onboarding',
      });
    }
  }, [user?.id, user?.publicMetadata?.currentStep, user?.publicMetadata?.onboardingCompleted]);

  useEffect(() => {
    const unsubscribe = checkOnboardingStatus();
    return () => {
      if (unsubscribe) {
        unsubscribe.then(unsub => unsub?.());
      }
    };
  }, [checkOnboardingStatus]);

  return status;
}; 