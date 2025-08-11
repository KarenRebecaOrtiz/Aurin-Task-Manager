import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAI, GoogleAIBackend } from "@firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import { getMessaging, isSupported } from "firebase/messaging";
import { getDatabase } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

// Helper function for conditional logging (only in development)
const debugLog = (message: string, ...args: unknown[]) => {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log(message, ...args);
  }
};

const app = initializeApp(firebaseConfig);

// Inicialización de App Check solo en el cliente con depuración
let appCheck: AppCheck | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== "undefined") {
  // Esperar a que reCAPTCHA esté disponible antes de inicializar App Check
  const initializeAppCheckSafely = () => {
    try {
      // Verificar si reCAPTCHA está disponible de forma segura
      const grecaptcha = (window as Window & { grecaptcha?: unknown }).grecaptcha;
      if (!grecaptcha) {
        debugLog("[Firebase] reCAPTCHA not ready yet, retrying in 500ms...");
        setTimeout(initializeAppCheckSafely, 500);
        return;
      }

      debugLog("[Firebase] Initializing App Check in client...");
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6Lcxe2UrAAAAAANiSWaLO_46zSm09wRhuYOEHfeb"), // Tu site key
        isTokenAutoRefreshEnabled: true,
      });
      debugLog("[Firebase] App Check initialized successfully.");
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn("[Firebase] App Check initialization failed, continuing without it:", error);
      appCheck = null;
    }
  };

  // Intentar inicializar App Check después de un delay para asegurar que reCAPTCHA esté listo
  setTimeout(initializeAppCheckSafely, 2000);
  
  // Inicializar Firebase Messaging solo en el cliente
  isSupported().then((supported) => {
    if (supported) {
      messaging = getMessaging(app);
      debugLog("[Firebase] Messaging initialized successfully.");
    } else {
      debugLog("[Firebase] Messaging not supported in this browser.");
    }
  }).catch((error) => {
    // eslint-disable-next-line no-console
    console.error("[Firebase] Error initializing messaging:", error);
  });
} else {
  debugLog("[Firebase] Running on server, skipping App Check and Messaging initialization.");
}

// Detectar Safari para aplicar configuración específica
const isSafari = typeof window !== "undefined" && 
  /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

// Configuración optimizada para Safari - Resuelve errores de CORS y WebChannel
// persistentLocalCache ya maneja la persistencia offline automáticamente
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  }),
  experimentalForceLongPolling: true // ✅ Fuerza Long Polling en vez de WebChannel (soluciona Safari)
});

// Log para debugging
if (typeof window !== "undefined") {
  debugLog("[Firebase] Browser detected:", isSafari ? "Safari" : "Other");
  debugLog("[Firebase] Using Long Polling for Firestore:", true);
  debugLog("[Firebase] Offline persistence enabled via persistentLocalCache");
  
  // Debugging adicional para Safari
  if (isSafari) {
    debugLog("[Firebase][Safari] User Agent:", navigator.userAgent);
    debugLog("[Firebase][Safari] Window location:", window.location.href);
    debugLog("[Firebase][Safari] Protocol:", window.location.protocol);
  }
}

export const storage = getStorage(app);
export const auth = getAuth(app);
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export { appCheck, messaging, app };

// Inicialización de Firebase Realtime Database (RTDB)
export const rtdb = getDatabase(app);

// Log para debugging RTDB
if (typeof window !== "undefined") {
  debugLog("[Firebase] RTDB initialized successfully");
}
