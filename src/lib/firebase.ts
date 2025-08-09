import { initializeApp } from "firebase/app";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAI, GoogleAIBackend } from "@firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import { getMessaging, isSupported } from "firebase/messaging";
import { getDatabase } from "firebase/database";
import { firebaseConfig } from "./firebaseConfig";

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
        console.log("[Firebase] reCAPTCHA not ready yet, retrying in 500ms...");
        setTimeout(initializeAppCheckSafely, 500);
        return;
      }

      console.log("[Firebase] Initializing App Check in client...");
      appCheck = initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider("6Lcxe2UrAAAAAANiSWaLO_46zSm09wRhuYOEHfeb"), // Tu site key
        isTokenAutoRefreshEnabled: true,
      });
      console.log("[Firebase] App Check initialized successfully.");
    } catch (error) {
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
      console.log("[Firebase] Messaging initialized successfully.");
    } else {
      console.log("[Firebase] Messaging not supported in this browser.");
    }
  }).catch((error) => {
    console.error("[Firebase] Error initializing messaging:", error);
  });
} else {
  console.log("[Firebase] Running on server, skipping App Check and Messaging initialization.");
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
  console.log("[Firebase] Browser detected:", isSafari ? "Safari" : "Other");
  console.log("[Firebase] Using Long Polling for Firestore:", true);
  console.log("[Firebase] Offline persistence enabled via persistentLocalCache");
  
  // Debugging adicional para Safari
  if (isSafari) {
    console.log("[Firebase][Safari] User Agent:", navigator.userAgent);
    console.log("[Firebase][Safari] Window location:", window.location.href);
    console.log("[Firebase][Safari] Protocol:", window.location.protocol);
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
  console.log("[Firebase] RTDB initialized successfully");
}
