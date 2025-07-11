import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  deleteDoc, 
  doc, 
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Recordatorio {
  id?: string;
  userId: string;
  titulo: string;
  descripcion: string;
  monto: number;
  fechaVencimiento: string;
  tipo: 'único' | 'semanal' | 'mensual' | 'trimestral' | 'anual';
  prioridad: 'baja' | 'media' | 'alta';
  activo: boolean;
  createdAt: Timestamp;
}

export interface RecordatorioInput {
  titulo: string;
  descripcion: string;
  monto: number;
  fechaVencimiento: string;
  tipo: 'único' | 'semanal' | 'mensual' | 'trimestral' | 'anual';
  prioridad: 'baja' | 'media' | 'alta';
  activo?: boolean;
}

export class RecordatoriosService {
  private static COLLECTION = 'recordatorios';

  // Agregar nuevo recordatorio
  static async addRecordatorio(userId: string, recordatorio: RecordatorioInput): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...recordatorio,
        userId,
        activo: true,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding recordatorio:', error);
      throw new Error('Error al guardar el recordatorio');
    }
  }

  // Escuchar recordatorios en tiempo real
  static subscribeToRecordatorios(
    userId: string, 
    callback: (recordatorios: Recordatorio[]) => void
  ) {
    // Try with composite index first, fallback to simple query if index doesn't exist
    let q;
    try {
      q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        orderBy('fechaVencimiento', 'asc')
      );
    } catch (error) {
      // Fallback to simple query without orderBy if composite index doesn't exist
      console.warn('Composite index not available for recordatorios, using simple query:', error);
      q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const recordatorios: Recordatorio[] = [];
      snapshot.forEach((doc) => {
        recordatorios.push({
          id: doc.id,
          ...doc.data()
        } as Recordatorio);
      });
      
      // Sort manually if we couldn't use orderBy in the query
      const sortedRecordatorios = recordatorios.sort((a, b) => 
        new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
      );
      
      callback(sortedRecordatorios);
    }, (error) => {
      console.error('Error in recordatorios subscription:', error);
      // If it's an index error, provide helpful guidance
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error('Firestore composite index required for recordatorios. Please create the index using the link provided in the error message.');
        // Try fallback query without orderBy
        const fallbackQuery = query(
          collection(db, this.COLLECTION),
          where('userId', '==', userId)
        );
        
        return onSnapshot(fallbackQuery, (snapshot) => {
          const recordatorios: Recordatorio[] = [];
          snapshot.forEach((doc) => {
            recordatorios.push({
              id: doc.id,
              ...doc.data()
            } as Recordatorio);
          });
          
          // Sort manually since we can't use orderBy
          const sortedRecordatorios = recordatorios.sort((a, b) => 
            new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
          );
          
          callback(sortedRecordatorios);
        });
      }
      
      // For other errors, return empty array to prevent app crash
      callback([]);
    });
  }

  // Actualizar estado activo del recordatorio
  static async toggleRecordatorio(recordatorioId: string, activo: boolean): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, recordatorioId), { activo });
    } catch (error) {
      console.error('Error toggling recordatorio:', error);
      throw new Error('Error al actualizar el recordatorio');
    }
  }

  // Eliminar recordatorio
  static async deleteRecordatorio(recordatorioId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, recordatorioId));
    } catch (error) {
      console.error('Error deleting recordatorio:', error);
      throw new Error('Error al eliminar el recordatorio');
    }
  }

  // Actualizar recordatorio
  static async updateRecordatorio(
    recordatorioId: string, 
    updates: Partial<RecordatorioInput>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, recordatorioId), updates);
    } catch (error) {
      console.error('Error updating recordatorio:', error);
      throw new Error('Error al actualizar el recordatorio');
    }
  }

  // Obtener recordatorios próximos a vencer
  static getRecordatoriosProximos(recordatorios: Recordatorio[], dias: number = 7): Recordatorio[] {
    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(hoy.getDate() + dias);

    return recordatorios.filter(recordatorio => {
      if (!recordatorio.activo) return false;
      
      const fechaVencimiento = new Date(recordatorio.fechaVencimiento);
      return fechaVencimiento >= hoy && fechaVencimiento <= fechaLimite;
    });
  }

  // Calcular días restantes
  static getDiasRestantes(fechaVencimiento: string): number {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  }
}