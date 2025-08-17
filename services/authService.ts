import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { db } from '../config/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName?: string | null;
  username?: string | null;
}

export class AuthService {
  // Registrar nuevo usuario
  static async register(email: string, password: string, username: string) {
    // Registrar usuario en Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    // Guardar username en la base de datos (Firestore)
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      createdAt: new Date().toISOString(),
    });
    return user;
  }

  // Iniciar sesión
  static async login(email: string, password: string): Promise<AuthUser> {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      // Obtener username desde Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      let username = null;
      if (userDoc.exists()) {
        username = userDoc.data().username || null;
      }
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        username
      };
    } catch (error: any) {
      throw new Error(this.getErrorMessage(error.code));
    }
  }

  // Cerrar sesión
  static async logout(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error: any) {
      throw new Error('Error al cerrar sesión');
    }
  }

  // Escuchar cambios de autenticación
  static onAuthStateChange(callback: (user: AuthUser | null) => void) {
    return onAuthStateChanged(auth, (user: User | null) => {
      const handleUser = async () => {
        if (user) {
          // Obtener username desde Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          let username = null;
          if (userDoc.exists()) {
            username = userDoc.data().username || null;
          }
          callback({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            username
          });
        } else {
          callback(null);
        }
      };
      handleUser();
    });
  }

  // Obtener usuario actual
  static getCurrentUser(): AuthUser | null {
    const user = auth.currentUser;
    // Nota: Este método no es async, así que aquí no se puede obtener el username de Firestore
    if (user) {
      return {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        // username no disponible aquí
      };
    }
    return null;
  }

  // Mensajes de error en español
  private static getErrorMessage(errorCode: string): string {
    switch (errorCode) {
      case 'auth/email-already-in-use':
        return 'Este email ya está registrado';
      case 'auth/weak-password':
        return 'La contraseña debe tener al menos 6 caracteres';
      case 'auth/invalid-email':
        return 'Email inválido';
      case 'auth/user-not-found':
        return 'Usuario no encontrado';
      case 'auth/wrong-password':
        return 'Contraseña incorrecta';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Intenta más tarde';
      default:
        return 'Error de autenticación';
    }
  }
}