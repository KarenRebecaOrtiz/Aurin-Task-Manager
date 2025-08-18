/**
 * Configuración centralizada para el sistema de notificaciones y email
 */

export const config = {
  // Configuración de email
  email: {
    user: process.env.EMAIL_USER || 'sodioinfo@gmail.com',
    pass: process.env.EMAIL_PASS || '',
    from: `"Sodio Task App" <${process.env.EMAIL_USER || 'sodioinfo@gmail.com'}>`,
  },
  
  // URL de la aplicación
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
  
  // Configuración de Firebase
  firebase: {
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  },
  
  // Configuración de Clerk
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY || '',
  },
  
  // Configuración de notificaciones
  notifications: {
    defaultExpiryDays: 7,
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

/**
 * Valida que las variables de entorno críticas estén configuradas
 */
export function validateConfig(): { isValid: boolean; missingVars: string[] } {
  const missingVars: string[] = [];
  
  if (!config.email.pass) {
    missingVars.push('EMAIL_PASS');
  }
  
  if (!config.clerk.secretKey) {
    missingVars.push('CLERK_SECRET_KEY');
  }
  
  if (!config.firebase.projectId) {
    missingVars.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  }
  
  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Obtiene la configuración validada
 * @throws Error si la configuración no es válida
 */
export function getValidatedConfig() {
  const validation = validateConfig();
  
  if (!validation.isValid) {
    throw new Error(
      `Missing required environment variables: ${validation.missingVars.join(', ')}`
    );
  }
  
  return config;
}
