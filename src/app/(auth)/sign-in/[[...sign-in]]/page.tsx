'use client';
import { SignIn } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import styles from './SignIn.module.scss';


export default function SignInPage() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Trigger animations after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Listen for Clerk sign-in events
  useEffect(() => {
    const handleSignInStart = () => {
      setIsSigningIn(true);
    };

    const handleSignInComplete = () => {
      setIsSigningIn(false);
    };

    // Add event listeners for Clerk events
    document.addEventListener('clerk:sign-in:start', handleSignInStart);
    document.addEventListener('clerk:sign-in:complete', handleSignInComplete);

    return () => {
      document.removeEventListener('clerk:sign-in:start', handleSignInStart);
      document.removeEventListener('clerk:sign-in:complete', handleSignInComplete);
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Loading overlay */}
      {isSigningIn && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loadingSpinner}>
            <div className={styles.spinner}></div>
            <p className={styles.loadingText}>Iniciando sesión...</p>
          </div>
        </div>
      )}
      
      {/* Left column: sign-in form */}
      <section className={styles.leftColumn}>
        <div className={styles.formContainer}>
          <div className={styles.formContent}>


            {/* Clerk SignIn component */}
            <div className={`${isLoaded ? styles.animateElement : ''} ${styles.animateDelay300}`}>
              <SignIn
                appearance={{
                  elements: {
                    formButtonPrimary: {
                      fontSize: 18,
                      textTransform: 'none',
                      border: '1px solid #d3df48',
                      color: '#121212',
                      backgroundColor: '#d3df48',
                      borderRadius: '1rem',
                      padding: '1rem',
                      fontWeight: 500,
                      transition: 'all 0.2s ease',
                      '&:hover, &:focus, &:active': {
                        backgroundColor: '#ffffff',
                      },
                    },
                    input: {
                      color: '#ffffff',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      border: 'none',
                      outline: 'none',
                      padding: '1rem',
                      borderRadius: '1rem',
                      '&::placeholder': {
                        color: 'rgba(255, 255, 255, 0.8)',
                      },
                    },
                    inputPlaceholder: {
                      color: 'rgba(255, 255, 255, 0.8)',
                    },
                    card: {
                      backgroundColor: 'transparent',
                      color: 'white !important',
                      border: 'none',
                      boxShadow: 'none',
                      padding: 0,
                    },
                    logoBox: {
                      borderRadius: '100px',
                      display: 'none !important',
                    },
                    headerTitle: {
                      color: 'white !important',
                      fontSize: '2.5rem',
                      fontWeight: 'bold',
                      letterSpacing: '-0.025em',
                      lineHeight: '1.2',
                    },
                    headerSubtitle: {
                      color: 'rgba(255, 255, 255, 0.7) !important',
                      fontSize: '1rem',
                    },
                    socialButtonsBlockButtonText: {
                      color: 'white',
                    },
                    dividerLine: {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                    formFieldLabel: {
                      color: 'white !important',
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      marginBottom: '0.5rem',
                    },
                    formFieldInput: {
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '1rem',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      backdropFilter: 'blur(10px)',
                      color: 'white !important',
                      padding: '1rem',
                      transition: 'all 0.2s ease',
                      '&:focus': {
                        borderColor: 'rgba(139, 92, 246, 0.7)',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                      },
                    },
                    footer: {
                      background: 'transparent',
                      color: 'rgba(255, 255, 255, 0.7) !important',
                      textAlign: 'center',
                      fontSize: '0.875rem',
                    },
                    footerActionLink: {
                      color: 'white !important',
                      textDecoration: 'none',
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        textDecoration: 'underline',
                      },
                    },
                    footerActionText: {
                      color: 'rgba(255, 255, 255, 0.7) !important',
                    },
                    logoImage: {
                      borderRadius: '100px',
                      display: 'none !important',
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
                afterSignInUrl='/dashboard/tasks'
                redirectUrl='/dashboard/tasks'
              />
            </div>


          </div>
        </div>
      </section>

      {/* Right column: hero image */}
      <section className={styles.rightColumn}>
        <div 
          className={`${styles.heroImage} ${isLoaded ? styles.animateSlideRight : ''} ${styles.animateDelay300}`}
          style={{ 
            backgroundImage: `url('/aurin.jpg')` 
          }}
        />
      </section>
    </div>
  );
}