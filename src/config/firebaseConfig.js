import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const REQUIRED_ENV_VARS = [
  ["VITE_FIREBASE_API_KEY", "apiKey"],
  ["VITE_FIREBASE_AUTH_DOMAIN", "authDomain"],
  ["VITE_FIREBASE_PROJECT_ID", "projectId"],
  ["VITE_FIREBASE_STORAGE_BUCKET", "storageBucket"],
  ["VITE_FIREBASE_MESSAGING_SENDER_ID", "messagingSenderId"],
  ["VITE_FIREBASE_APP_ID", "appId"],
];

const firebaseConfig = REQUIRED_ENV_VARS.reduce((config, [envKey, configKey]) => {
  const rawValue = import.meta.env[envKey];
  const value = typeof rawValue === "string" ? rawValue.trim() : rawValue;

  if (!value) {
    throw new Error(
      `[firebaseConfig] Variável de ambiente obrigatória ausente: ${envKey}`
    );
  }

  config[configKey] = value;
  return config;
}, {});

const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
if (typeof measurementId === "string" && measurementId.trim()) {
  firebaseConfig.measurementId = measurementId.trim();
}

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, db, auth, storage };
