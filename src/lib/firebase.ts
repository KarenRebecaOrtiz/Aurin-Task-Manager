import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getAI, GoogleAIBackend } from "@firebase/ai";
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from "firebase/app-check";
import { getMessaging, isSupported } from "firebase/messaging";
import { firebaseConfig } from "./firebaseConfig";

const app = initializeApp(firebaseConfig);

// Inicialización de App Check solo en el cliente con depuración
let appCheck: AppCheck | null = null;
let messaging: ReturnType<typeof getMessaging> | null = null;

if (typeof window !== "undefined") {
  console.log("[Firebase] Initializing App Check in client...");
  appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider("6Lcxe2UrAAAAAANiSWaLO_46zSm09wRhuYOEHfeb"), // Tu site key
    isTokenAutoRefreshEnabled: true,
  });
  console.log("[Firebase] App Check initialized successfully.");
  
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

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const ai = getAI(app, { backend: new GoogleAIBackend() });
export { appCheck, messaging };
