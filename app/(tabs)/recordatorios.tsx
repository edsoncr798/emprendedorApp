import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Plus, Bell, Calendar, Clock, X, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { RecordatoriosService, Recordatorio, RecordatorioInput } from '../../services/recordatoriosService';
import { Redirect } from 'expo-router';

const tiposRecordatorio = ['único', 'semanal', 'mensual', 'trimestral', 'anual'];
const prioridades = ['baja', 'media', 'alta'];

export default function RecordatoriosScreen() {
  // Mover todos los hooks aquí, antes de cualquier return
  const { user, loading } = useAuth();
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [nuevoRecordatorio, setNuevoRecordatorio] = useState<RecordatorioInput>({
    titulo: '',
    descripcion: '',
    monto: 0,
    fechaVencimiento: '',
    tipo: 'mensual',
    prioridad: 'media'
  });

  useEffect(() => {
    if (!user) return;
    const unsubscribe = RecordatoriosService.subscribeToRecordatorios(
      user.uid,
      (recordatoriosData) => {
        setRecordatorios(recordatoriosData);
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
      month: 'long',
      year: 'numeric'
    });
  };

  const getDiasRestantes = (fechaVencimiento: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    const diferencia = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'alta': return '#EF4444';
      case 'media': return '#F59E0B';
      case 'baja': return '#22C55E';
      default: return '#6B7280';
    }
  };

  const filtrarRecordatorios = () => {
    let recordatoriosFiltrados = recordatorios;

    if (filtroActivo === 'activos') {
      recordatoriosFiltrados = recordatoriosFiltrados.filter(r => r.activo);
    } else if (filtroActivo === 'proximos') {
      recordatoriosFiltrados = recordatoriosFiltrados.filter(r => {
        const dias = getDiasRestantes(r.fechaVencimiento);
        return dias <= 7 && dias >= 0 && r.activo;
      });
    }

    return recordatoriosFiltrados.sort((a, b) => {
      const diasA = getDiasRestantes(a.fechaVencimiento);
      const diasB = getDiasRestantes(b.fechaVencimiento);
      return diasA - diasB;
    });
  };

  const handleGuardarRecordatorio = async () => {
    if (!nuevoRecordatorio.titulo || !nuevoRecordatorio.fechaVencimiento) {
      Alert.alert('Error', 'Por favor completa al menos el título y la fecha');
      return;
    }

    if (!user) return;

    setSaving(true);
    try {
      await RecordatoriosService.addRecordatorio(user.uid, nuevoRecordatorio);

      setModalVisible(false);
      setNuevoRecordatorio({
        titulo: '',
        descripcion: '',
        monto: 0,
        fechaVencimiento: '',
        tipo: 'mensual',
        prioridad: 'media'
      });

      Alert.alert('¡Éxito!', 'Recordatorio creado correctamente');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleRecordatorio = async (recordatorio: Recordatorio) => {
    if (!recordatorio.id) return;

    try {
      await RecordatoriosService.toggleRecordatorio(recordatorio.id, !recordatorio.activo);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const recordatoriosFiltrados = filtrarRecordatorios();
  const recordatoriosProximos = RecordatoriosService.getRecordatoriosProximos(recordatorios, 3);

  if (loading || loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando recordatorios...</Text>
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
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Mis Recordatorios</Text>
            <Text style={styles.subtitle}>No olvides tus pagos importantes</Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Alertas Urgentes */}
        {recordatoriosProximos.length > 0 && (
          <View style={styles.alertasContainer}>
            <Text style={styles.sectionTitle}>🚨 ¡Atención! ({recordatoriosProximos.length})</Text>
            {recordatoriosProximos.map((recordatorio) => {
              const dias = getDiasRestantes(recordatorio.fechaVencimiento);
              return (
                <View key={recordatorio.id} style={styles.alertaCard}>
                  <AlertTriangle size={20} color="#EF4444" />
                  <View style={styles.alertaContent}>
                    <Text style={styles.alertaTitulo}>{recordatorio.titulo}</Text>
                    <Text style={styles.alertaTexto}>
                      Vence {dias === 0 ? 'HOY' : `en ${dias} día${dias > 1 ? 's' : ''}`}
                      {recordatorio.monto > 0 && <Text> - {formatCurrency(recordatorio.monto)}</Text>}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Filtros */}
        <View style={styles.filtrosContainer}>
          <Text style={styles.sectionTitle}>Mis Recordatorios</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtroTabs}>
            {['todos', 'activos', 'proximos'].map((filtro) => (
              <TouchableOpacity
                key={filtro}
                style={[
                  styles.filtroTab,
                  filtroActivo === filtro && styles.filtroTabActive
                ]}
                onPress={() => setFiltroActivo(filtro)}
              >
                <Text style={[
                  styles.filtroTabText,
                  filtroActivo === filtro && styles.filtroTabTextActive
                ]}>
                  {filtro === 'todos' ? 'Todos' :
                    filtro === 'activos' ? 'Activos' : 'Próximos'}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Recordatorios */}
        <View style={styles.recordatoriosList}>
          {recordatoriosFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <Bell size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No hay recordatorios</Text>
              <Text style={styles.emptyStateSubtext}>
                {filtroActivo === 'todos'
                  ? 'Crea tu primer recordatorio para no olvidar pagos importantes'
                  : `No hay recordatorios ${filtroActivo === 'activos' ? 'activos' : 'próximos a vencer'}`
                }
              </Text>
            </View>
          ) : (
            recordatoriosFiltrados.map((recordatorio) => {
              const diasRestantes = getDiasRestantes(recordatorio.fechaVencimiento);
              const esUrgente = diasRestantes <= 3 && diasRestantes >= 0;

              return (
                <View key={recordatorio.id} style={[
                  styles.recordatorioCard,
                  !recordatorio.activo && styles.recordatorioInactivo,
                  esUrgente && recordatorio.activo && styles.recordatorioUrgente
                ]}>
                  <View style={styles.recordatorioHeader}>
                    <View style={styles.recordatorioInfo}>
                      <Text style={[
                        styles.recordatorioTitulo,
                        !recordatorio.activo && styles.textoInactivo
                      ]}>
                        {recordatorio.titulo}
                      </Text>
                      {recordatorio.descripcion && (
                        <Text style={[
                          styles.recordatorioDescripcion,
                          !recordatorio.activo && styles.textoInactivo
                        ]}>
                          {recordatorio.descripcion}
                        </Text>
                      )}
                    </View>
                    <View style={[
                      styles.prioridadIndicador,
                      { backgroundColor: getColorPrioridad(recordatorio.prioridad) }
                    ]}>
                      <Text style={styles.prioridadTexto}>
                        {recordatorio.prioridad.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordatorioDetalles}>
                    <View style={styles.recordatorioDetalle}>
                      <Calendar size={16} color="#6B7280" />
                      <Text style={[
                        styles.recordatorioDetalleTexto,
                        !recordatorio.activo && styles.textoInactivo
                      ]}>
                        {formatDate(recordatorio.fechaVencimiento)}
                      </Text>
                    </View>

                    {recordatorio.monto > 0 && (
                      <View style={styles.recordatorioDetalle}>
                        <Text style={[
                          styles.recordatorioMonto,
                          !recordatorio.activo && styles.textoInactivo
                        ]}>
                          {formatCurrency(recordatorio.monto)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.recordatorioDetalle}>
                      <Clock size={16} color="#6B7280" />
                      <Text style={[
                        styles.recordatorioTipo,
                        !recordatorio.activo && styles.textoInactivo
                      ]}>
                        {recordatorio.tipo}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.recordatorioFooter}>
                    <Text style={[
                      styles.diasRestantes,
                      esUrgente && recordatorio.activo && styles.diasUrgentes,
                      !recordatorio.activo && styles.textoInactivo
                    ]}>
                      {diasRestantes < 0 ?
                        `Venció hace ${Math.abs(diasRestantes)} día${Math.abs(diasRestantes) > 1 ? 's' : ''}` :
                        diasRestantes === 0 ?
                          '¡Vence HOY!' :
                          diasRestantes === 1 ?
                            'Vence mañana' :
                            `Faltan ${diasRestantes} días`
                      }
                    </Text>

                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        recordatorio.activo ? styles.toggleButtonActive : styles.toggleButtonInactive
                      ]}
                      onPress={() => toggleRecordatorio(recordatorio)}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        recordatorio.activo ? styles.toggleButtonTextActive : styles.toggleButtonTextInactive
                      ]}>
                        {recordatorio.activo ? 'Activo' : 'Pausado'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Consejos */}
        <View style={styles.consejosContainer}>
          <Text style={styles.sectionTitle}>💡 Consejos</Text>
          <View style={styles.consejoCard}>
            <Text style={styles.consejoTexto}>
              Configura recordatorios para todos tus gastos fijos (alquiler, servicios, seguros).
              Esto te ayudará a planificar mejor tu flujo de caja.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modal para Nuevo Recordatorio */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Nuevo Recordatorio</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <X size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalForm}>
              {/* Título */}
              <Text style={styles.formLabel}>¿Qué necesitas recordar?</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ej: Pago de alquiler, Recibo de luz..."
                value={nuevoRecordatorio.titulo}
                onChangeText={(text) => setNuevoRecordatorio({ ...nuevoRecordatorio, titulo: text })}
              />

              {/* Descripción */}
              <Text style={styles.formLabel}>Descripción (opcional)</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Detalles adicionales..."
                value={nuevoRecordatorio.descripcion}
                onChangeText={(text) => setNuevoRecordatorio({ ...nuevoRecordatorio, descripcion: text })}
                multiline
                numberOfLines={2}
              />

              {/* Monto */}
              <Text style={styles.formLabel}>Monto (opcional)</Text>
              <View style={styles.montoContainer}>
                <Text style={styles.montoSymbol}>S/</Text>
                <TextInput
                  style={styles.montoInput}
                  placeholder="0.00"
                  value={nuevoRecordatorio.monto.toString()}
                  onChangeText={(text) => setNuevoRecordatorio({ ...nuevoRecordatorio, monto: parseFloat(text) || 0 })}
                  keyboardType="numeric"
                />
              </View>

              {/* Fecha */}
              <Text style={styles.formLabel}>Fecha de vencimiento</Text>
              <TextInput
                style={styles.formInput}
                placeholder="YYYY-MM-DD (ej: 2025-01-30)"
                value={nuevoRecordatorio.fechaVencimiento}
                onChangeText={(text) => setNuevoRecordatorio({ ...nuevoRecordatorio, fechaVencimiento: text })}
              />

              {/* Tipo */}
              <Text style={styles.formLabel}>¿Con qué frecuencia?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.opcionesContainer}>
                {tiposRecordatorio.map((tipo) => (
                  <TouchableOpacity
                    key={tipo}
                    style={[
                      styles.opcionButton,
                      nuevoRecordatorio.tipo === tipo && styles.opcionButtonActive
                    ]}
                    onPress={() => setNuevoRecordatorio({ ...nuevoRecordatorio, tipo: tipo as "único" | "semanal" | "mensual" | "trimestral" | "anual" })}
                  >
                    <Text style={[
                      styles.opcionButtonText,
                      nuevoRecordatorio.tipo === tipo && styles.opcionButtonTextActive
                    ]}>{tipo}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Prioridad */}
              <Text style={styles.formLabel}>Importancia</Text>
              <View style={styles.prioridadContainer}>
                {prioridades.map((prioridad) => (
                  <TouchableOpacity
                    key={prioridad}
                    style={[
                      styles.prioridadButton,
                      nuevoRecordatorio.prioridad === prioridad && styles.prioridadButtonActive,
                      { borderColor: getColorPrioridad(prioridad) }
                    ]}
                    onPress={() => setNuevoRecordatorio({ ...nuevoRecordatorio, prioridad: prioridad as "baja" | "media" | "alta" })}
                  >
                    <Text style={[
                      styles.prioridadButtonText,
                      nuevoRecordatorio.prioridad === prioridad && { color: getColorPrioridad(prioridad) }
                    ]}>
                      {prioridad.charAt(0).toUpperCase() + prioridad.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Botón Guardar */}
              <TouchableOpacity
                style={[styles.guardarButton, saving && styles.guardarButtonDisabled]}
                onPress={handleGuardarRecordatorio}
                disabled={saving}
              >
                <Text style={styles.guardarButtonText}>
                  {saving ? 'Creando...' : 'Crear Recordatorio'}
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
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
    paddingBottom: 30,
  },
  title: {
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
  addButton: {
    backgroundColor: '#3B82F6',
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
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
  alertasContainer: {
    marginBottom: 30,
  },
  alertaCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  alertaContent: {
    marginLeft: 12,
    flex: 1,
  },
  alertaTitulo: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#DC2626',
    marginBottom: 2,
  },
  alertaTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#DC2626',
  },
  filtrosContainer: {
    marginBottom: 20,
  },
  filtroTabs: {
    flexDirection: 'row',
  },
  filtroTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  filtroTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  filtroTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  filtroTabTextActive: {
    color: '#FFFFFF',
  },
  recordatoriosList: {
    marginBottom: 30,
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  recordatorioCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  recordatorioInactivo: {
    opacity: 0.6,
  },
  recordatorioUrgente: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  recordatorioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  recordatorioInfo: {
    flex: 1,
  },
  recordatorioTitulo: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  recordatorioDescripcion: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  prioridadIndicador: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  prioridadTexto: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
  },
  recordatorioDetalles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 16,
  },
  recordatorioDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  recordatorioDetalleTexto: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  recordatorioMonto: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  recordatorioTipo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  recordatorioFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  diasRestantes: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  diasUrgentes: {
    color: '#EF4444',
    fontFamily: 'Inter-SemiBold',
  },
  textoInactivo: {
    color: '#9CA3AF',
  },
  toggleButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  toggleButtonActive: {
    backgroundColor: '#22C55E',
    borderColor: '#22C55E',
  },
  toggleButtonInactive: {
    backgroundColor: 'transparent',
    borderColor: '#9CA3AF',
  },
  toggleButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  toggleButtonTextActive: {
    color: '#FFFFFF',
  },
  toggleButtonTextInactive: {
    color: '#9CA3AF',
  },
  consejosContainer: {
    marginBottom: 40,
  },
  consejoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  consejoTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
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
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginRight: 8,
  },
  montoInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  opcionesContainer: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  opcionButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  opcionButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  opcionButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  opcionButtonTextActive: {
    color: '#FFFFFF',
  },
  prioridadContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  prioridadButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
  },
  prioridadButtonActive: {
    backgroundColor: '#F9FAFB',
  },
  prioridadButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  guardarButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 40,
  },
  guardarButtonDisabled: {
    opacity: 0.6,
  },
  guardarButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
});