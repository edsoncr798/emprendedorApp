import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, DollarSign, Calendar } from 'lucide-react-native';
import { router, Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { MovimientosService, Movimiento } from '../../services/movimientosService';

export default function HomeScreen() {
  const { user, loading } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // All hooks must be called before any conditional returns
  useEffect(() => {
    if (!user) return;

    const unsubscribe = MovimientosService.subscribeToMovimientos(
      user.uid,
      (movimientosData) => {
        setMovimientos(movimientosData);
        setLoadingData(false);
      }
    );

    return unsubscribe;
  }, [user]);

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Show loading while checking auth
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const totales = MovimientosService.calculateTotals(movimientos);
  const movimientosRecientes = movimientos.slice(0, 3);
  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short'
    });
  };

  if (loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando datos...</Text>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.greeting}>¡Hola {user?.username ? user.username : user?.email?.split('@')[0]}!</Text>
          <Text style={styles.subtitle}>Aquí tienes el resumen de tu negocio</Text>
        </View>

        {/* Resumen Financiero */}
        <View style={styles.summaryContainer}>
          <View style={[styles.summaryCard, styles.gananciasCard]}>
            <View style={styles.summaryHeader}>
              <DollarSign size={24} color="#FFFFFF" />
              <Text style={styles.summaryLabel}>Ganancias del Mes</Text>
            </View>
            <Text style={styles.summaryAmount}>{formatCurrency(totales.ganancia)}</Text>
            <Text style={styles.summarySubtext}>
              {totales.ganancia >= 0 ? '¡Excelente trabajo!' : 'Necesitas revisar gastos'}
            </Text>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryMiniCard, styles.ingresosCard]}>
              <TrendingUp size={20} color="#22C55E" />
              <Text style={styles.miniCardLabel}>Ingresos</Text>
              <Text style={styles.miniCardAmount}>{formatCurrency(totales.totalIngresos)}</Text>
            </View>

            <View style={[styles.summaryMiniCard, styles.gastosCard]}>
              <TrendingDown size={20} color="#EF4444" />
              <Text style={styles.miniCardLabel}>Gastos</Text>
              <Text style={styles.miniCardAmount}>{formatCurrency(totales.totalGastos)}</Text>
            </View>
          </View>
        </View>

        {/* Acciones Rápidas */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Acciones Rápidas</Text>
          <View style={styles.actionsRow}>
            <TouchableOpacity 
              style={[styles.actionButton, styles.ingresoButton]}
              onPress={() => router.push('/movimientos')}
            >
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Registrar Ingreso</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionButton, styles.gastoButton]}
              onPress={() => router.push('/movimientos')}
            >
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.actionButtonText}>Registrar Gasto</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Movimientos Recientes */}
        <View style={styles.recentContainer}>
          <View style={styles.recentHeader}>
            <Text style={styles.sectionTitle}>Movimientos Recientes</Text>
            <TouchableOpacity onPress={() => router.push('/movimientos')}>
              <Text style={styles.viewAllText}>Ver todos</Text>
            </TouchableOpacity>
          </View>
          
          {movimientosRecientes.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No hay movimientos aún</Text>
              <Text style={styles.emptyStateSubtext}>
                Comienza registrando tu primer ingreso o gasto
              </Text>
            </View>
          ) : (
            movimientosRecientes.map((movimiento) => (
              <View key={movimiento.id} style={styles.movimientoCard}>
                <View style={styles.movimientoInfo}>
                  <View style={[
                    styles.movimientoIcon,
                    movimiento.tipo === 'ingreso' ? styles.ingresoIcon : styles.gastoIcon
                  ]}>
                    {movimiento.tipo === 'ingreso' ? 
                      <TrendingUp size={16} color="#FFFFFF" /> : 
                      <TrendingDown size={16} color="#FFFFFF" />
                    }
                  </View>
                  <View style={styles.movimientoDetails}>
                    <Text style={styles.movimientoConcepto}>{movimiento.concepto}</Text>
                    <Text style={styles.movimientoFecha}>{formatDate(movimiento.fecha)}</Text>
                  </View>
                </View>
                <Text style={[
                  styles.movimientoMonto,
                  movimiento.tipo === 'ingreso' ? styles.montoPositivo : styles.montoNegativo
                ]}>
                  {movimiento.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(movimiento.monto)}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Consejos */}
        <View style={styles.tipsContainer}>
          <Text style={styles.sectionTitle}>💡 Consejo del día</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipText}>
              Registra todos tus movimientos diariamente. Esto te ayudará a tener un control exacto de tu negocio.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
  },
  greeting: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  summaryContainer: {
    marginBottom: 30,
  },
  summaryCard: {
    backgroundColor: '#3B82F6',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
  },
  gananciasCard: {
    backgroundColor: '#3B82F6',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  summaryAmount: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  summarySubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#DBEAFE',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 12,
  },
  summaryMiniCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  ingresosCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  gastosCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  miniCardLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginTop: 8,
    marginBottom: 4,
  },
  miniCardAmount: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  actionsContainer: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    gap: 8,
  },
  ingresoButton: {
    backgroundColor: '#22C55E',
  },
  gastoButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  recentContainer: {
    marginBottom: 30,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#3B82F6',
  },
  movimientoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  movimientoInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  movimientoIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  ingresoIcon: {
    backgroundColor: '#22C55E',
  },
  gastoIcon: {
    backgroundColor: '#EF4444',
  },
  movimientoDetails: {
    flex: 1,
  },
  movimientoConcepto: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    marginBottom: 2,
  },
  movimientoFecha: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  movimientoMonto: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  montoPositivo: {
    color: '#22C55E',
  },
  montoNegativo: {
    color: '#EF4444',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  tipsContainer: {
    marginBottom: 40,
  },
  tipCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  tipText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
});