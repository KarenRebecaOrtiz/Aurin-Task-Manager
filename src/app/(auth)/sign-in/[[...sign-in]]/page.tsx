'use client';
import { SignIn } from '@clerk/nextjs';
import styles from './SignIn.module.scss';

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <div className={styles.leftColumn}>
      </div>
      <div className={styles.rightColumn}>
        <SignIn
          appearance={{
            elements: {
              formButtonPrimary: {
                fontSize: 18,
                textTransform: 'none',
                border: '1px solid #d3df48',
                color: '#121212',
                backgroundColor: '#d3df48',
                '&:hover, &:focus, &:active': {
                  backgroundColor: '#ffffff',
                },
              },
              input: {
                color: '#ffffff',
                backgroundColor: '#121212',
                fontSize: '14px',
              },
              inputPlaceholder: {
                color: '#999999',
              },
              card: {
                backgroundColor: '#121212',
                color: 'white !important',
              },
              logoBox: {
                borderRadius: '100px',
              },
              headerTitle: {
                color: 'white !important',
              },
              headerSubtitle: {
                color: 'white !important',
              },
              socialButtonsBlockButtonText: {
                color: 'white',
              },
              dividerLine: {
                backgroundColor: '#ffffff40',
              },
              formFieldLabel: {
                color: 'white !important',
              },
              formFieldInput: {
                backgroundColor: '#121212',
                border: '1px solid #ffffff40',
                color: 'white !important',
              },
              footer: {
                background: '#121212',
                color: 'white !important',
              },
              footerActionLink: {
                color: 'white !important',
              },
              footerActionText: {
                color: 'white !important',
              },
              logoImage: {
                borderRadius: '100px',
              },
              providerIcon__apple: {
                filter: 'invert(100)'
              },
              // Estilos para el container "use another method"
              alternativeMethods: {
                color: 'white',
              },
              alternativeMethodsBlockButton: {
                color: 'white !important',
                '&:hover': {
                  color: 'white !important',
                },
              },
              alternativeMethodsBlockButtonText: {
                color: 'white !important',
              },
              alternativeMethodsBlockButtonArrow: {
                color: 'white !important',
              },
              backLink: {
                color: 'white !important',
              },
              footerAction: {
                color: 'white !important',
              },
              // Asegurar que todos los elementos internos sean blancos
              cardBox: {
                color: 'white !important',
              },
              main: {
                color: 'white !important',
              },
              header: {
                color: 'white !important',
              },
              // Estilos específicos para el modal de contraseña - SOLO TEXTOS
              identityPreview: {
                color: 'white !important',
              },
              identityPreviewText: {
                color: 'white !important',
              },
              identityPreviewEditButton: {
                color: 'white !important',
              },
              form: {
                color: 'white !important',
              },
              formField: {
                color: 'white !important',
              },
              formFieldAction: {
                color: 'white !important',
              },
              formFieldInputShowPasswordButton: {
                color: 'white !important',
              },
            },
          }}
          routing='path'
          path='/sign-in'
          signUpUrl='/sign-up'
          fallbackRedirectUrl='/dashboard/tasks'
        />
      </div>
    </div>
  );
}