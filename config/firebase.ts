import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, initializeAuth } from 'firebase/auth';
import { getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import type { Auth } from 'firebase/auth';

// Configuración de Firebase - Reemplaza con tus credenciales reales

const firebaseConfig = {
  apiKey: "AIzaSyDlWpIjXOlMj6VjcmnE0lOzhxhWQaIA_Xo",
  authDomain: "my-assistant-accountant.firebaseapp.com",
  projectId: "my-assistant-accountant",
  storageBucket: "my-assistant-accountant.firebasestorage.app",
  messagingSenderId: "1088578151127",
  appId: "1:1088578151127:web:0d81a6213f7dc890dc0692",
  measurementId: "G-LR4453JJ8E"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Inicializar servicios
export const db = getFirestore(app);

let auth: Auth;
if (Platform.OS === 'web') {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage)
  });
}
export { auth };

// Solo para desarrollo - conectar a emuladores locales
if (__DEV__ && Platform.OS !== 'web') {
  // Descomentar estas líneas si usas emuladores de Firebase
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app;