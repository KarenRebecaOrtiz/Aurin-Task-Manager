// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { User } from '@clerk/nextjs';

declare module '@clerk/nextjs' {
  interface User {
    publicMetadata: {
      role?: string;
      description?: string;
      onboardingCompleted?: boolean;
      currentStep?: number;
    };
  }
}