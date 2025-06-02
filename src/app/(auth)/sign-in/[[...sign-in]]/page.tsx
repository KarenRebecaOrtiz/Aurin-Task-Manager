// src/app/(auth)/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from '@clerk/nextjs';
import styles from './SignIn.module.scss';

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        <h1>Sodio Plattform</h1>
        <p>Gestión de proyectos para tu equipo</p>
      </div>
      <div className={styles.rightColumn}>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl="/sign-in"
          fallbackRedirectUrl="/dashboard/tasks" // Reemplaza afterSignInUrl y afterSignUpUrl
          appearance={{
            variables: {
              colorPrimary: '#4CAF50',
              colorBackground: '#FFFFFF',
              colorText: '#111827',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              borderRadius: '0.5rem',
            },
            elements: {
              card: styles.clerkCard,
              headerTitle: styles.clerkHeaderTitle,
              headerSubtitle: styles.clerkHeaderSubtitle,
              formButtonPrimary: styles.clerkButton,
              formButtonSecondary: styles.clerkButtonSecondary,
              formFieldInput: styles.clerkInput,
              formFieldLabel: styles.clerkLabel,
              formFieldError: styles.clerkError,
              socialButtons: styles.clerkSocialButtons,
              footer: styles.clerkFooter,
              footerActionLink: styles.clerkFooterLink,
              logoImage: styles.clerkLogo,
            },
            layout: {
              socialButtonsPlacement: 'bottom',
              logoPlacement: 'none',
            },
          }}
        />
      </div>
    </div>
  );
}