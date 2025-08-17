import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown, Search, Filter, X } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { MovimientosService, Movimiento, MovimientoInput } from '../../services/movimientosService';
import { Redirect } from 'expo-router';

const categorias = {
  ingresos: [
    'Ventas de productos',
    'Servicios prestados',
    'Comisiones',
    'Otros ingresos'
  ],
  gastos: [
    'Materiales y suministros',
    'Alquiler del local',
    'Servicios (luz, agua, internet)',
    'Transporte',
    'Comida',
    'Otros gastos'
  ]
};

export default function MovimientosScreen() {
  const { user, loading } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados del formulario
  const [nuevoMovimiento, setNuevoMovimiento] = useState<MovimientoInput>({
    tipo: 'ingreso',
    concepto: '',
    categoria: '',
    monto: 0,
    fecha: new Date().toISOString().split('T')[0]
  });

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

  useEffect(() => {
    if (!loading && !user) {
      setModalVisible(false);
    }
  }, [user, loading]);

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filtrarMovimientos = () => {
    let movimientosFiltrados = movimientos;

    if (filtroTipo !== 'todos') {
      movimientosFiltrados = movimientosFiltrados.filter(m => m.tipo === filtroTipo);
    }

    if (busqueda) {
      movimientosFiltrados = movimientosFiltrados.filter(m =>
        m.concepto.toLowerCase().includes(busqueda.toLowerCase()) ||
        m.categoria.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    return movimientosFiltrados.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  };

  const handleGuardarMovimiento = async () => {
    if (!nuevoMovimiento.concepto || !nuevoMovimiento.categoria || !nuevoMovimiento.monto) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      const movimientoData: MovimientoInput = {
        ...nuevoMovimiento,
        monto: parseFloat(nuevoMovimiento.monto.toString())
      };

      await MovimientosService.addMovimiento(user.uid, movimientoData);

      setModalVisible(false);
      setNuevoMovimiento({
        tipo: 'ingreso',
        concepto: '',
        categoria: '',
        monto: 0,
        fecha: new Date().toISOString().split('T')[0]
      });

      Alert.alert(
        '¡Éxito!',
        `${movimientoData.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'} registrado correctamente`
      );
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const movimientosFiltrados = filtrarMovimientos();

  if (loading || loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando movimientos...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Mis Movimientos</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setModalVisible(true)}
        >
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Buscador y Filtros */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar movimientos..."
            placeholderTextColor="#ccc"
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterTabs}>
          {['todos', 'ingreso', 'gasto'].map((tipo) => (
            <TouchableOpacity
              key={tipo}
              style={[
                styles.filterTab,
                filtroTipo === tipo && styles.filterTabActive
              ]}
              onPress={() => setFiltroTipo(tipo)}
            >
              <Text style={[
                styles.filterTabText,
                filtroTipo === tipo && styles.filterTabTextActive
              ]}>
                {tipo === 'todos' ? 'Todos' : tipo === 'ingreso' ? 'Ingresos' : 'Gastos'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Lista de Movimientos */}
      <ScrollView style={styles.movimientosList} showsVerticalScrollIndicator={false}>
        {movimientosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No se encontraron movimientos</Text>
            <Text style={styles.emptyStateSubtext}>
              {busqueda ? 'Prueba con otros términos de búsqueda' : 'Comienza registrando tu primer movimiento'}
            </Text>
          </View>
        ) : (
          movimientosFiltrados.map((movimiento) => (
            <View key={movimiento.id} style={styles.movimientoCard}>
              <View style={styles.movimientoInfo}>
                <View style={[
                  styles.movimientoIcon,
                  movimiento.tipo === 'ingreso' ? styles.ingresoIcon : styles.gastoIcon
                ]}>
                  {movimiento.tipo === 'ingreso' ?
                    <TrendingUp size={20} color="#FFFFFF" /> :
                    <TrendingDown size={20} color="#FFFFFF" />
                  }
                </View>
                <View style={styles.movimientoDetails}>
                  <Text style={styles.movimientoConcepto}>{movimiento.concepto}</Text>
                  <Text style={styles.movimientoCategoria}>{movimiento.categoria}</Text>
                  <Text style={styles.movimientoFecha}>{formatDate(movimiento.fecha)}</Text>
                </View>
              </View>
              <View style={styles.movimientoRight}>
                <Text style={[
                  styles.movimientoMonto,
                  movimiento.tipo === 'ingreso' ? styles.montoPositivo : styles.montoNegativo
                ]}>
                  {movimiento.tipo === 'ingreso' ? '+' : '-'}{formatCurrency(movimiento.monto)}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Modal para Nuevo Movimiento */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Movimiento</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Tipo de Movimiento */}
              <Text style={styles.formLabel}>Tipo de Movimiento</Text>
              <View style={styles.tipoContainer}>
                <TouchableOpacity
                  style={[
                    styles.tipoButton,
                    nuevoMovimiento.tipo === 'ingreso' && styles.tipoButtonActive,
                    nuevoMovimiento.tipo === 'ingreso' && styles.ingresoActive
                  ]}
                  onPress={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'ingreso', categoria: '' })}
                >
                  <TrendingUp size={20} color={nuevoMovimiento.tipo === 'ingreso' ? '#FFFFFF' : '#22C55E'} />
                  <Text style={[
                    styles.tipoButtonText,
                    nuevoMovimiento.tipo === 'ingreso' && styles.tipoButtonTextActive
                  ]}>Ingreso</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.tipoButton,
                    nuevoMovimiento.tipo === 'gasto' && styles.tipoButtonActive,
                    nuevoMovimiento.tipo === 'gasto' && styles.gastoActive
                  ]}
                  onPress={() => setNuevoMovimiento({ ...nuevoMovimiento, tipo: 'gasto', categoria: '' })}
                >
                  <TrendingDown size={20} color={nuevoMovimiento.tipo === 'gasto' ? '#FFFFFF' : '#EF4444'} />
                  <Text style={[
                    styles.tipoButtonText,
                    nuevoMovimiento.tipo === 'gasto' && styles.tipoButtonTextActive
                  ]}>Gasto</Text>
                </TouchableOpacity>
              </View>

              {/* Concepto */}
              <Text style={styles.formLabel}>¿Qué fue?</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej: Venta de productos, Pago de alquiler..."
                placeholderTextColor="#ccc"
                value={nuevoMovimiento.concepto}
                onChangeText={(text) => setNuevoMovimiento({ ...nuevoMovimiento, concepto: text })}
              />

              {/* Categoría */}
              <Text style={styles.formLabel}>Categoría</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriaContainer}>
                {categorias[nuevoMovimiento.tipo === 'ingreso' ? 'ingresos' : 'gastos'].map((categoria) => (
                  <TouchableOpacity
                    key={categoria}
                    style={[
                      styles.categoriaButton,
                      nuevoMovimiento.categoria === categoria && styles.categoriaButtonActive
                    ]}
                    onPress={() => setNuevoMovimiento({ ...nuevoMovimiento, categoria })}
                  >
                    <Text style={[
                      styles.categoriaButtonText,
                      nuevoMovimiento.categoria === categoria && styles.categoriaButtonTextActive
                    ]}>{categoria}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Monto */}
              <Text style={styles.formLabel}>¿Cuánto?</Text>
              <View style={styles.montoContainer}>
                <Text style={styles.montoSymbol}>S/</Text>
                <TextInput
                  style={styles.montoInput}
                  placeholder="Monto"
                  placeholderTextColor="#ccc"
                  value={nuevoMovimiento.monto.toString()}
                  onChangeText={(text) => setNuevoMovimiento({ ...nuevoMovimiento, monto: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              {/* Botón Guardar */}
              <TouchableOpacity
                style={[
                  styles.guardarButton,
                  nuevoMovimiento.tipo === 'ingreso' ? styles.guardarIngreso : styles.guardarGasto,
                  saving && styles.guardarButtonDisabled
                ]}
                onPress={handleGuardarMovimiento}
                disabled={saving}
              >
                <Text style={styles.guardarButtonText}>
                  {saving ? 'Guardando...' : `Guardar ${nuevoMovimiento.tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}`}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
  },
  addButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  filterTabs: {
    flexDirection: 'row',
  },
  filterTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filterTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  movimientosList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
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
    width: 40,
    height: 40,
    borderRadius: 10,
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 2,
  },
  movimientoCategoria: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  movimientoFecha: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
  },
  movimientoRight: {
    alignItems: 'flex-end',
  },
  movimientoMonto: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  montoPositivo: {
    color: '#22C55E',
  },
  montoNegativo: {
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  modalForm: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  formLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 12,
    marginTop: 20,
  },
  tipoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  tipoButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  tipoButtonActive: {
    borderColor: 'transparent',
  },
  ingresoActive: {
    backgroundColor: '#22C55E',
  },
  gastoActive: {
    backgroundColor: '#EF4444',
  },
  tipoButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
  },
  tipoButtonTextActive: {
    color: '#FFFFFF',
  },
  formInput: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoriaContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  categoriaButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoriaButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoriaButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categoriaButtonTextActive: {
    color: '#FFFFFF',
  },
  montoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  montoSymbol: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginRight: 8,
  },
  montoInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  guardarButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  guardarIngreso: {
    backgroundColor: '#22C55E',
  },
  guardarGasto: {
    backgroundColor: '#EF4444',
  },
  guardarButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  guardarButtonDisabled: {
    opacity: 0.6,
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
});