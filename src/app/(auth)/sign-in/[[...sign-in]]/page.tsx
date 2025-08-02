'use client';
import { SignIn } from '@clerk/nextjs';
import { useState, useEffect, useRef, useId } from 'react';
import Image from 'next/image';
import styles from './SignIn.module.scss';

// --- ANIMATED BACKGROUND COMPONENT ---
function mapRange(
  value: number,
  fromLow: number,
  fromHigh: number,
  toLow: number,
  toHigh: number
): number {
  if (fromLow === fromHigh) {
    return toLow;
  }
  const percentage = (value - fromLow) / (fromHigh - fromLow);
  return toLow + percentage * (toHigh - toLow);
}

const useInstanceId = (): string => {
  const id = useId();
  const cleanId = id.replace(/:/g, "");
  const instanceId = `shadowoverlay-${cleanId}`;
  return instanceId;
};

function AnimatedBackground() {
  const id = useInstanceId();
  const animation = { scale: 50, speed: 50 };
  const noise = { opacity: 0.3, scale: 1 };
  const color = 'rgba(128, 128, 128, 0.25)';
  
  const animationEnabled = animation && animation.scale > 0;
  const feColorMatrixRef = useRef<SVGFEColorMatrixElement>(null);
  
  const displacementScale = animation ? mapRange(animation.scale, 1, 100, 20, 100) : 0;
  const animationDuration = animation ? mapRange(animation.speed, 1, 100, 1000, 50) : 1;

  useEffect(() => {
    if (feColorMatrixRef.current && animationEnabled) {
      let hueRotateValue = 0;
      const animate = () => {
        hueRotateValue = (hueRotateValue + 1) % 360;
        if (feColorMatrixRef.current) {
          feColorMatrixRef.current.setAttribute("values", String(hueRotateValue));
        }
        requestAnimationFrame(animate);
      };
      const animationId = requestAnimationFrame(animate);
      
      return () => {
        cancelAnimationFrame(animationId);
      };
    }
  }, [animationEnabled, animationDuration]);

  return (
    <div className={styles.animatedBackground}>
      <div
        className={styles.backgroundLayer}
        style={{
          filter: animationEnabled ? `url(#${id}) blur(4px)` : "none"
        }}
      >
        {animationEnabled && (
          <svg style={{ position: "absolute" }}>
            <defs>
              <filter id={id}>
                <feTurbulence
                  result="undulation"
                  numOctaves="2"
                  baseFrequency={`${mapRange(animation.scale, 0, 100, 0.001, 0.0005)},${mapRange(animation.scale, 0, 100, 0.004, 0.002)}`}
                  seed="0"
                  type="turbulence"
                />
                <feColorMatrix
                  ref={feColorMatrixRef}
                  in="undulation"
                  type="hueRotate"
                  values="180"
                />
                <feColorMatrix
                  in="dist"
                  result="circulation"
                  type="matrix"
                  values="4 0 0 0 1  4 0 0 0 1  4 0 0 0 1  1 0 0 0 0"
                />
                <feDisplacementMap
                  in="SourceGraphic"
                  in2="circulation"
                  scale={displacementScale}
                  result="dist"
                />
                <feDisplacementMap
                  in="dist"
                  in2="undulation"
                  scale={displacementScale}
                  result="output"
                />
              </filter>
            </defs>
          </svg>
        )}
        <div
          className={styles.maskLayer}
          style={{
            backgroundColor: color,
            maskImage: `url('https://framerusercontent.com/images/ceBGguIpUU8luwByxuQz79t7To.png')`,
            maskSize: "cover",
            maskRepeat: "no-repeat",
            maskPosition: "center",
          }}
        />
      </div>

      {noise && noise.opacity > 0 && (
        <div
          className={styles.noiseLayer}
          style={{
            backgroundImage: `url("https://framerusercontent.com/images/g0QcWrxr87K0ufOxIUFBakwYA8.png")`,
            backgroundSize: `${noise.scale * 200}px`,
            backgroundRepeat: "repeat",
            opacity: noise.opacity / 2
          }}
        />
      )}
    </div>
  );
}

// --- TYPE DEFINITIONS ---
export interface Testimonial {
  avatarSrc: string;
  name: string;
  handle: string;
  text: string;
}

// --- SUB-COMPONENTS ---
const TestimonialCard = ({ testimonial, delay }: { testimonial: Testimonial, delay: string }) => (
  <div className={`${styles.testimonialCard} ${styles.animateTestimonial} ${delay}`}>
    <Image src={testimonial.avatarSrc} alt="avatar" width={50} height={50} className={styles.avatar} />
    <div className={styles.content}>
      <p className={styles.name}>{testimonial.name}</p>
      <p className={styles.handle}>{testimonial.handle}</p>
      <p className={styles.text}>{testimonial.text}</p>
    </div>
  </div>
);

// Testimonios de ejemplo
const testimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "María González",
    handle: "@mariadigital",
    text: "¡Plataforma increíble! La experiencia de usuario es fluida y las funciones son exactamente lo que necesitaba."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Carlos Rodríguez",
    handle: "@carlostech",
    text: "Este servicio ha transformado mi forma de trabajar. Diseño limpio, funciones potentes y excelente soporte."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martínez",
    handle: "@davidcrea",
    text: "He probado muchas plataformas, pero esta destaca. Intuitiva, confiable y realmente útil para la productividad."
  },
];

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
        <AnimatedBackground />
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

      {/* Right column: hero image + testimonials */}
      <section className={styles.rightColumn}>
        <div 
          className={`${styles.heroImage} ${isLoaded ? styles.animateSlideRight : ''} ${styles.animateDelay300}`}
          style={{ 
            backgroundImage: `url('/aurin.jpg')` 
          }}
        />
        
        {testimonials.length > 0 && (
          <div className={`${styles.testimonialsContainer} ${styles.testimonialsResponsive}`}>
            <TestimonialCard testimonial={testimonials[0]} delay={isLoaded ? styles.animateDelay1000 : ''} />
            {testimonials[1] && <TestimonialCard testimonial={testimonials[1]} delay={isLoaded ? styles.animateDelay1200 : ''} />}
            {testimonials[2] && <TestimonialCard testimonial={testimonials[2]} delay={isLoaded ? styles.animateDelay1400 : ''} />}
          </div>
        )}
      </section>
    </div>
  );
}