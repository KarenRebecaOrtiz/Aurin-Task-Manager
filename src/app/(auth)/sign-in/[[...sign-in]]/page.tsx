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
          routing='path'
          path='/sign-in'
          signUpUrl='/sign-up'
          fallbackRedirectUrl='/dashboard/tasks'
        />
      </div>
    </div>
  );
}
