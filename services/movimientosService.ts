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
  Timestamp,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Movimiento {
  id?: string;
  userId: string;
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
  createdAt: Timestamp;
}

export interface MovimientoInput {
  tipo: 'ingreso' | 'gasto';
  concepto: string;
  categoria: string;
  monto: number;
  fecha: string;
}

export class MovimientosService {
  private static COLLECTION = 'movimientos';

  // Agregar nuevo movimiento
  static async addMovimiento(userId: string, movimiento: MovimientoInput): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, this.COLLECTION), {
        ...movimiento,
        userId,
        createdAt: Timestamp.now()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding movimiento:', error);
      throw new Error('Error al guardar el movimiento');
    }
  }

  // Escuchar movimientos en tiempo real
  static subscribeToMovimientos(
    userId: string, 
    callback: (movimientos: Movimiento[]) => void
  ) {
    // Try with composite index first, fallback to simple query if index doesn't exist
    let q;
    try {
      q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId),
        orderBy('fecha', 'desc')
      );
    } catch (error) {
      // Fallback to simple query without orderBy if composite index doesn't exist
      console.warn('Composite index not available, using simple query:', error);
      q = query(
        collection(db, this.COLLECTION),
        where('userId', '==', userId)
      );
    }

    return onSnapshot(q, (snapshot) => {
      const movimientos: Movimiento[] = [];
      snapshot.forEach((doc) => {
        movimientos.push({
          id: doc.id,
          ...doc.data()
        } as Movimiento);
      });
      
      // Sort manually if we couldn't use orderBy in the query
      const sortedMovimientos = movimientos.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
      
      callback(sortedMovimientos);
    }, (error) => {
      console.error('Error in movimientos subscription:', error);
      // If it's an index error, provide helpful guidance
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error('Firestore composite index required. Please create the index using the link provided in the error message.');
        // Try fallback query without orderBy
        const fallbackQuery = query(
          collection(db, this.COLLECTION),
          where('userId', '==', userId)
        );
        
        return onSnapshot(fallbackQuery, (snapshot) => {
          const movimientos: Movimiento[] = [];
          snapshot.forEach((doc) => {
            movimientos.push({
              id: doc.id,
              ...doc.data()
            } as Movimiento);
          });
          
          // Sort manually since we can't use orderBy
          const sortedMovimientos = movimientos.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
          
          callback(sortedMovimientos);
        });
      }
      
      // For other errors, return empty array to prevent app crash
      callback([]);
    });
  }

  // Obtener movimientos por rango de fechas
  static async getMovimientosByDateRange(
    userId: string, 
    startDate: string, 
    endDate: string
  ): Promise<Movimiento[]> {
    try {
      // Try with composite index first
      let q;
      try {
        q = query(
          collection(db, this.COLLECTION),
          where('userId', '==', userId),
          where('fecha', '>=', startDate),
          where('fecha', '<=', endDate),
          orderBy('fecha', 'desc')
        );
      } catch (indexError) {
        // Fallback without orderBy if composite index doesn't exist
        console.warn('Using fallback query without orderBy for date range');
        q = query(
          collection(db, this.COLLECTION),
          where('userId', '==', userId),
          where('fecha', '>=', startDate),
          where('fecha', '<=', endDate)
        );
      }

      const snapshot = await getDocs(q);
      const movimientos: Movimiento[] = [];
      
      snapshot.forEach((doc) => {
        movimientos.push({
          id: doc.id,
          ...doc.data()
        } as Movimiento);
      });

      // Sort manually to ensure correct order
      return movimientos.sort((a, b) => 
        new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      );
    } catch (error) {
      console.error('Error getting movimientos by date:', error);
      
      // If it's an index error, provide more specific guidance
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.error('Firestore composite index required for date range queries.');
        // Try a simpler fallback query
        try {
          const fallbackQuery = query(
            collection(db, this.COLLECTION),
            where('userId', '==', userId)
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const allMovimientos: Movimiento[] = [];
          
          fallbackSnapshot.forEach((doc) => {
            const data = doc.data() as Movimiento;
            // Filter by date range manually
            if (data.fecha >= startDate && data.fecha <= endDate) {
              allMovimientos.push({
                id: doc.id,
                ...data
              });
            }
          });
          
          return allMovimientos.sort((a, b) => 
            new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
          );
        } catch (fallbackError) {
          console.error('Fallback query also failed:', fallbackError);
          throw new Error('Error al obtener movimientos');
        }
      }
      
      throw new Error('Error al obtener movimientos');
    }
  }

  // Eliminar movimiento
  static async deleteMovimiento(movimientoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.COLLECTION, movimientoId));
    } catch (error) {
      console.error('Error deleting movimiento:', error);
      throw new Error('Error al eliminar el movimiento');
    }
  }

  // Actualizar movimiento
  static async updateMovimiento(
    movimientoId: string, 
    updates: Partial<MovimientoInput>
  ): Promise<void> {
    try {
      await updateDoc(doc(db, this.COLLECTION, movimientoId), updates);
    } catch (error) {
      console.error('Error updating movimiento:', error);
      throw new Error('Error al actualizar el movimiento');
    }
  }

  // Calcular totales
  static calculateTotals(movimientos: Movimiento[]) {
    const totalIngresos = movimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);

    const totalGastos = movimientos
      .filter(m => m.tipo === 'gasto')
      .reduce((sum, m) => sum + m.monto, 0);

    return {
      totalIngresos,
      totalGastos,
      ganancia: totalIngresos - totalGastos
    };
  }

  // Obtener movimientos por categoría
  static getMovimientosByCategory(movimientos: Movimiento[]) {
    const categorias: { [key: string]: { monto: number; count: number } } = {};

    movimientos.forEach(movimiento => {
      if (!categorias[movimiento.categoria]) {
        categorias[movimiento.categoria] = { monto: 0, count: 0 };
      }
      categorias[movimiento.categoria].monto += movimiento.monto;
      categorias[movimiento.categoria].count += 1;
    });

    return categorias;
  }
}