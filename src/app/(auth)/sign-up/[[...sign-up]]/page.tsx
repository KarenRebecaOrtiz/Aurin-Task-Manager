// src/app/(auth)/sign-up/[[...sign-up]]/page.tsx
import { SignUp } from '@clerk/nextjs';
import styles from '../../sign-in/[[...sign-in]]/SignIn.module.scss';

export default function SignUpPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
        <h1>Sodio Plattform</h1>
        <p>Gestión de proyectos para tu equipo</p>
      </div>
      <div className={styles.rightColumn}>
        <SignUp
          routing='path'
          path='/sign-up'
          signInUrl='/sign-in'
          fallbackRedirectUrl='/dashboard/tasks'
        />
      </div>
    </div>
  );
}
