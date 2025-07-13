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
      
      console.log('[useOnboardingStatus] Clerk metadata check:', {
        onboardingCompleted: clerkOnboardingCompleted,
        currentStep: clerkCurrentStep,
      });
      
      if (clerkOnboardingCompleted) {
        console.log('[useOnboardingStatus] Onboarding completed (Clerk metadata)');
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
            
            console.log('[useOnboardingStatus] Firestore onboarding status:', {
              isCompleted: firestoreOnboardingCompleted,
              currentStep: firestoreCurrentStep,
            });
            
            // If Firestore shows completed but Clerk doesn't, sync to Clerk
            if (firestoreOnboardingCompleted && !clerkOnboardingCompleted) {
              console.log('[useOnboardingStatus] Syncing completion status to Clerk');
              // This would trigger a sync to Clerk (handled by SyncUserToFirestore)
            }
            
            setStatus({
              isCompleted: firestoreOnboardingCompleted,
              currentStep: firestoreCurrentStep,
              isLoading: false,
              error: null,
            });
          } else {
            console.log('[useOnboardingStatus] No user document, onboarding not started');
            setStatus({
              isCompleted: false,
              currentStep: 1,
              isLoading: false,
              error: null,
            });
          }
        },
        (error) => {
          console.error('[useOnboardingStatus] Error fetching onboarding status:', error);
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            error: 'Error al cargar estado de onboarding',
          }));
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('[useOnboardingStatus] Error in onboarding check:', error);
      setStatus({
        isCompleted: false,
        currentStep: 1,
        isLoading: false,
        error: 'Error al verificar estado de onboarding',
      });
    }
  }, [user?.id, user?.publicMetadata?.onboardingCompleted, user?.publicMetadata?.currentStep]);

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