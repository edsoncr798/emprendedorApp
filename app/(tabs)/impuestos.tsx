import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Calculator, DollarSign, Info, CircleCheck as CheckCircle, CircleAlert as AlertCircle, Calendar } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { MovimientosService, Movimiento } from '../../services/movimientosService';
import { Redirect } from 'expo-router';

const regimenesTributarios = [
  {
    id: 'rus',
    nombre: 'Nuevo Régimen Único Simplificado (RUS)',
    descripcion: 'Para pequeños negocios con ingresos limitados',
    color: '#22C55E',
    categorias: [
      {
        limite: 5000,
        impuesto: 20,
        descripcion: 'Hasta S/ 5,000 en ingresos o gastos mensuales'
      },
      {
        limite: 8000,
        impuesto: 50,
        descripcion: 'Hasta S/ 8,000 en ingresos o gastos mensuales'
      }
    ]
  },
  {
    id: 'rer',
    nombre: 'Régimen Especial de Renta (RER)',
    descripcion: 'Para negocios medianos con ingresos moderados',
    color: '#3B82F6',
    porcentaje: 1.5,
    descripcion_calculo: '1.5% de los ingresos netos mensuales'
  },
  {
    id: 'mype',
    nombre: 'Régimen MYPE Tributario',
    descripcion: 'Para micro y pequeñas empresas',
    color: '#F59E0B',
    tramos: [
      {
        limite: 300,
        porcentaje: 1.0,
        descripcion: 'Hasta 300 UIT anuales: 1% de ingresos netos'
      },
      {
        limite: 1700,
        porcentaje: 1.5,
        descripcion: 'De 300 a 1700 UIT anuales: 1.5% o coeficiente (el mayor)'
      }
    ]
  },
  {
    id: 'general',
    nombre: 'Régimen General',
    descripcion: 'Para empresas grandes sin límites de ingresos',
    color: '#8B5CF6',
    porcentaje: 1.5,
    descripcion_calculo: '1.5% o coeficiente (el mayor) de ingresos netos mensuales'
  }
];

const UIT_2025 = 5150; // Valor UIT para 2025

export default function ImpuestosScreen() {
  const { user, loading } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [regimenSeleccionado, setRegimenSeleccionado] = useState('rus');
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().getMonth());
  const [anoSeleccionado, setAnoSeleccionado] = useState(new Date().getFullYear());
  const [coeficiente, setCoeficiente] = useState('');
  const [resultadoCalculo, setResultadoCalculo] = useState<any>(null);
  const [loadingData, setLoadingData] = useState(true);


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

  const formatCurrency = (amount: number) => {
    return `S/ ${amount.toFixed(2)}`;
  };

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  // Obtener datos del mes seleccionado
  const obtenerDatosMes = () => {
    const movimientosMes = movimientos.filter(movimiento => {
      const fecha = new Date(movimiento.fecha);
      return fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anoSeleccionado;
    });

    const ingresos = movimientosMes.filter(m => m.tipo === 'ingreso');
    const gastos = movimientosMes.filter(m => m.tipo === 'gasto');
    
    const ingresosMensuales = ingresos.reduce((sum, m) => sum + m.monto, 0);
    const gastosMensuales = gastos.reduce((sum, m) => sum + m.monto, 0);

    return { ingresosMensuales, gastosMensuales, movimientosMes };
  };

  // Calcular ingresos anuales proyectados
  const calcularIngresosAnuales = () => {
    const fechaActual = new Date();
    const fechaInicio = new Date(fechaActual.getFullYear() - 1, fechaActual.getMonth(), 1);
    
    const movimientosUltimoAno = movimientos.filter(movimiento => {
      const fecha = new Date(movimiento.fecha);
      return fecha >= fechaInicio;
    });

    const ingresosUltimoAno = movimientosUltimoAno
      .filter(m => m.tipo === 'ingreso')
      .reduce((sum, m) => sum + m.monto, 0);

    return ingresosUltimoAno;
  };

  const calcularImpuestoRUS = (ingresos: number, gastos: number) => {
    const mayor = Math.max(ingresos, gastos);
    
    if (mayor <= 5000) {
      return {
        categoria: 1,
        impuesto: 20,
        descripcion: 'Categoría 1: Hasta S/ 5,000',
        cumpleRequisitos: true
      };
    } else if (mayor <= 8000) {
      return {
        categoria: 2,
        impuesto: 50,
        descripcion: 'Categoría 2: Hasta S/ 8,000',
        cumpleRequisitos: true
      };
    } else {
      return {
        categoria: null,
        impuesto: 0,
        descripcion: 'Supera los límites del RUS',
        cumpleRequisitos: false,
        mensaje: 'Tus ingresos o gastos superan S/ 8,000. Debes cambiar a otro régimen.'
      };
    }
  };

  const calcularImpuestoRER = (ingresos: number) => {
    const impuesto = ingresos * 0.015;
    return {
      impuesto: impuesto,
      porcentaje: 1.5,
      descripcion: '1.5% de ingresos netos mensuales',
      cumpleRequisitos: true
    };
  };

  const calcularImpuestoMYPE = (ingresosAnuales: number, ingresosMensuales: number, coeficienteValue?: number) => {
    const uitAnuales = ingresosAnuales / UIT_2025;
    
    if (uitAnuales <= 300) {
      const impuesto = ingresosMensuales * 0.01;
      return {
        impuesto: impuesto,
        porcentaje: 1.0,
        tramo: 1,
        descripcion: 'Hasta 300 UIT anuales: 1% de ingresos netos',
        cumpleRequisitos: true
      };
    } else if (uitAnuales <= 1700) {
      const impuesto15 = ingresosMensuales * 0.015;
      const impuestoCoeficiente = coeficienteValue ? (ingresosMensuales * coeficienteValue / 100) : 0;
      const impuestoFinal = Math.max(impuesto15, impuestoCoeficiente);
      
      return {
        impuesto: impuestoFinal,
        porcentaje: impuestoFinal === impuesto15 ? 1.5 : coeficienteValue,
        tramo: 2,
        descripcion: 'De 300 a 1700 UIT anuales: 1.5% o coeficiente (el mayor)',
        cumpleRequisitos: true,
        detalleCalculo: {
          impuesto15: impuesto15,
          impuestoCoeficiente: impuestoCoeficiente,
          metodoUsado: impuestoFinal === impuesto15 ? '1.5%' : 'Coeficiente'
        }
      };
    } else {
      return {
        impuesto: 0,
        descripcion: 'Supera 1700 UIT anuales',
        cumpleRequisitos: false,
        mensaje: 'Tus ingresos superan 1700 UIT anuales. Debes usar el Régimen General.'
      };
    }
  };

  const calcularImpuestoGeneral = (ingresosMensuales: number, coeficienteValue?: number) => {
    const impuesto15 = ingresosMensuales * 0.015;
    const impuestoCoeficiente = coeficienteValue ? (ingresosMensuales * coeficienteValue / 100) : 0;
    const impuestoFinal = Math.max(impuesto15, impuestoCoeficiente);
    
    return {
      impuesto: impuestoFinal,
      porcentaje: impuestoFinal === impuesto15 ? 1.5 : coeficienteValue,
      descripcion: '1.5% o coeficiente (el mayor) de ingresos netos mensuales',
      cumpleRequisitos: true,
      detalleCalculo: {
        impuesto15: impuesto15,
        impuestoCoeficiente: impuestoCoeficiente,
        metodoUsado: impuestoFinal === impuesto15 ? '1.5%' : 'Coeficiente'
      }
    };
  };

  const calcularImpuesto = () => {
    const { ingresosMensuales, gastosMensuales, movimientosMes } = obtenerDatosMes();

    if (movimientosMes.length === 0) {
      Alert.alert('Sin datos', `No hay movimientos registrados para ${meses[mesSeleccionado]} ${anoSeleccionado}`);
      return;
    }

    if (ingresosMensuales <= 0) {
      Alert.alert('Sin ingresos', `No hay ingresos registrados para ${meses[mesSeleccionado]} ${anoSeleccionado}`);
      return;
    }

    const ingresosAnuales = calcularIngresosAnuales();
    const coef = parseFloat(coeficiente) || 0;

    let resultado;

    switch (regimenSeleccionado) {
      case 'rus':
        resultado = calcularImpuestoRUS(ingresosMensuales, gastosMensuales);
        break;
      case 'rer':
        resultado = calcularImpuestoRER(ingresosMensuales);
        break;
      case 'mype':
        resultado = calcularImpuestoMYPE(ingresosAnuales, ingresosMensuales, coef);
        break;
      case 'general':
        resultado = calcularImpuestoGeneral(ingresosMensuales, coef);
        break;
      default:
        return;
    }

    setResultadoCalculo({
      ...resultado,
      regimen: regimenesTributarios.find(r => r.id === regimenSeleccionado),
      ingresosMensuales,
      gastosMensuales,
      ingresosAnuales,
      mesCalculado: meses[mesSeleccionado],
      anoCalculado: anoSeleccionado
    });
  };

  const limpiarCalculos = () => {
    setCoeficiente('');
    setResultadoCalculo(null);
  };

  const regimenActual = regimenesTributarios.find(r => r.id === regimenSeleccionado);
  const { ingresosMensuales, gastosMensuales, movimientosMes } = obtenerDatosMes();

  if (loading || loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando datos...</Text>
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
          <Text style={styles.title}>Calculadora de Impuestos</Text>
          <Text style={styles.subtitle}>Calcula cuánto debes pagar según tu régimen tributario</Text>
        </View>

        {/* Selector de Período */}
        <View style={styles.periodoSelector}>
          <Text style={styles.sectionTitle}>Período a Calcular</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mesesContainer}>
            {meses.map((mes, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mesButton,
                  mesSeleccionado === index && styles.mesButtonActive
                ]}
                onPress={() => {
                  setMesSeleccionado(index);
                  setResultadoCalculo(null);
                }}
              >
                <Calendar size={16} color={mesSeleccionado === index ? '#FFFFFF' : '#6B7280'} />
                <Text style={[
                  styles.mesButtonText,
                  mesSeleccionado === index && styles.mesButtonTextActive
                ]}>{mes}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Datos del Período */}
        <View style={styles.datosContainer}>
          <Text style={styles.sectionTitle}>Datos de {meses[mesSeleccionado]} {anoSeleccionado}</Text>
          
          {movimientosMes.length === 0 ? (
            <View style={styles.sinDatosCard}>
              <AlertCircle size={24} color="#F59E0B" />
              <View style={styles.sinDatosContent}>
                <Text style={styles.sinDatosTitle}>Sin movimientos</Text>
                <Text style={styles.sinDatosText}>
                  No hay movimientos registrados para este período. Registra algunos ingresos y gastos para calcular impuestos.
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.datosCard}>
              <View style={styles.datoItem}>
                <Text style={styles.datoLabel}>Ingresos del mes:</Text>
                <Text style={styles.datoValor}>{formatCurrency(ingresosMensuales)}</Text>
              </View>
              <View style={styles.datoItem}>
                <Text style={styles.datoLabel}>Gastos del mes:</Text>
                <Text style={styles.datoValor}>{formatCurrency(gastosMensuales)}</Text>
              </View>
              <View style={styles.datoItem}>
                <Text style={styles.datoLabel}>Movimientos registrados:</Text>
                <Text style={styles.datoValor}>{movimientosMes.length}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Selector de Régimen */}
        <View style={styles.regimenSelector}>
          <Text style={styles.sectionTitle}>Selecciona tu Régimen Tributario</Text>
          
          {regimenesTributarios.map((regimen) => (
            <TouchableOpacity
              key={regimen.id}
              style={[
                styles.regimenCard,
                regimenSeleccionado === regimen.id && styles.regimenCardActive,
                { borderLeftColor: regimen.color }
              ]}
              onPress={() => {
                setRegimenSeleccionado(regimen.id);
                limpiarCalculos();
              }}
            >
              <View style={styles.regimenInfo}>
                <Text style={[
                  styles.regimenNombre,
                  regimenSeleccionado === regimen.id && styles.regimenNombreActive
                ]}>
                  {regimen.nombre}
                </Text>
                <Text style={[
                  styles.regimenDescripcion,
                  regimenSeleccionado === regimen.id && styles.regimenDescripcionActive
                ]}>
                  {regimen.descripcion}
                </Text>
              </View>
              {regimenSeleccionado === regimen.id && (
                <CheckCircle size={24} color={regimen.color} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Información del Régimen Seleccionado */}
        {regimenActual && (
          <View style={styles.infoRegimen}>
            <Text style={styles.sectionTitle}>Información del {regimenActual.nombre}</Text>
            
            <View style={[styles.infoCard, { borderLeftColor: regimenActual.color }]}>
              <Info size={20} color={regimenActual.color} />
              <View style={styles.infoContent}>
                {regimenActual.id === 'rus' && (
                  <View>
                    <Text style={styles.infoText}>Categorías disponibles:</Text>
                    {regimenActual.categorias?.map((cat, index) => (
                      <Text key={index} style={styles.infoSubtext}>
                        • {cat.descripcion}: {formatCurrency(cat.impuesto)} mensual
                      </Text>
                    ))}
                  </View>
                )}
                
                {regimenActual.id === 'rer' && (
                  <Text style={styles.infoText}>
                    Pagas el {regimenActual.porcentaje}% de tus ingresos netos mensuales
                  </Text>
                )}
                
                {regimenActual.id === 'mype' && (
                  <View>
                    <Text style={styles.infoText}>Tramos de pago:</Text>
                    {regimenActual.tramos?.map((tramo, index) => (
                      <Text key={index} style={styles.infoSubtext}>
                        • {tramo.descripcion}
                      </Text>
                    ))}
                  </View>
                )}
                
                {regimenActual.id === 'general' && (
                  <Text style={styles.infoText}>
                    {regimenActual.descripcion_calculo}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Configuración Adicional */}
        {(regimenSeleccionado === 'mype' || regimenSeleccionado === 'general') && (
          <View style={styles.configuracionContainer}>
            <Text style={styles.sectionTitle}>Configuración Adicional</Text>
            
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Coeficiente (opcional)</Text>
              <View style={styles.montoContainer}>
                <TextInput
                  style={styles.montoInput}
                  placeholder="0.00"
                  value={coeficiente}
                  onChangeText={setCoeficiente}
                  keyboardType="numeric"
                />
                <Text style={styles.montoSymbol}>%</Text>
              </View>
              <Text style={styles.inputHelp}>
                Coeficiente = (Impuesto año anterior / Ingresos anuales) × 100
              </Text>
            </View>
          </View>
        )}

        {/* Botones */}
        {movimientosMes.length > 0 && ingresosMensuales > 0 && (
          <View style={styles.botonesContainer}>
            <TouchableOpacity 
              style={[styles.calcularButton, { backgroundColor: regimenActual?.color }]}
              onPress={calcularImpuesto}
            >
              <Calculator size={20} color="#FFFFFF" />
              <Text style={styles.calcularButtonText}>Calcular Impuesto</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.limpiarButton}
              onPress={limpiarCalculos}
            >
              <Text style={styles.limpiarButtonText}>Limpiar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Resultado del Cálculo */}
        {resultadoCalculo && (
          <View style={styles.resultadoContainer}>
            <Text style={styles.sectionTitle}>Resultado del Cálculo</Text>
            
            <View style={[
              styles.resultadoCard,
              resultadoCalculo.cumpleRequisitos ? styles.resultadoExito : styles.resultadoError
            ]}>
              {resultadoCalculo.cumpleRequisitos ? (
                <CheckCircle size={24} color="#22C55E" />
              ) : (
                <AlertCircle size={24} color="#EF4444" />
              )}
              
              <View style={styles.resultadoContent}>
                <Text style={styles.resultadoTitulo}>
                  {resultadoCalculo.regimen.nombre}
                </Text>
                <Text style={styles.resultadoPeriodo}>
                  {resultadoCalculo.mesCalculado} {resultadoCalculo.anoCalculado}
                </Text>
                
                {resultadoCalculo.cumpleRequisitos ? (
                  <View>
                    <Text style={styles.resultadoImpuesto}>
                      Impuesto a pagar: {formatCurrency(resultadoCalculo.impuesto)}
                    </Text>
                    <Text style={styles.resultadoDescripcion}>
                      {resultadoCalculo.descripcion}
                    </Text>
                    
                    {resultadoCalculo.detalleCalculo && (
                      <View style={styles.detalleCalculo}>
                        <Text style={styles.detalleTexto}>
                          • 1.5%: {formatCurrency(resultadoCalculo.detalleCalculo.impuesto15)}
                        </Text>
                        <Text style={styles.detalleTexto}>
                          • Coeficiente: {formatCurrency(resultadoCalculo.detalleCalculo.impuestoCoeficiente)}
                        </Text>
                        <Text style={styles.detalleTexto}>
                          • Método usado: {resultadoCalculo.detalleCalculo.metodoUsado}
                        </Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View>
                    <Text style={styles.resultadoErrorText}>No cumples los requisitos</Text>
                    <Text style={styles.resultadoMensaje}>
                      {resultadoCalculo.mensaje}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Información Adicional */}
        <View style={styles.infoAdicional}>
          <Text style={styles.sectionTitle}>💡 Información Importante</Text>
          
          <View style={styles.consejoCard}>
            <Text style={styles.consejoTitulo}>¿Cómo elegir mi régimen?</Text>
            <Text style={styles.consejoTexto}>
              • RUS: Para negocios muy pequeños con ingresos limitados{'\n'}
              • RER: Para negocios medianos con crecimiento moderado{'\n'}
              • MYPE: Para micro y pequeñas empresas en crecimiento{'\n'}
              • General: Para empresas grandes sin límites
            </Text>
          </View>

          <View style={styles.consejoCard}>
            <Text style={styles.consejoTitulo}>Recuerda</Text>
            <Text style={styles.consejoTexto}>
              • Estos cálculos son referenciales{'\n'}
              • Consulta con un contador para casos específicos{'\n'}
              • Los pagos se realizan mensualmente{'\n'}
              • UIT 2025: {formatCurrency(UIT_2025)}
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
  periodoSelector: {
    marginBottom: 30,
  },
  mesesContainer: {
    flexDirection: 'row',
  },
  mesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  mesButtonActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  mesButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  mesButtonTextActive: {
    color: '#FFFFFF',
  },
  datosContainer: {
    marginBottom: 30,
  },
  sinDatosCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  sinDatosContent: {
    marginLeft: 12,
    flex: 1,
  },
  sinDatosTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 4,
  },
  sinDatosText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  datosCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  datoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  datoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  datoValor: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  regimenSelector: {
    marginBottom: 30,
  },
  regimenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  regimenCardActive: {
    backgroundColor: '#F0F9FF',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  regimenInfo: {
    flex: 1,
  },
  regimenNombre: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  regimenNombreActive: {
    color: '#1E40AF',
  },
  regimenDescripcion: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  regimenDescripcionActive: {
    color: '#3B82F6',
  },
  infoRegimen: {
    marginBottom: 30,
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    borderLeftWidth: 4,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  infoSubtext: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 4,
  },
  configuracionContainer: {
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 8,
  },
  montoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
  },
  montoSymbol: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginLeft: 8,
  },
  montoInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#1F2937',
  },
  inputHelp: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    marginTop: 4,
  },
  botonesContainer: {
    gap: 12,
    marginBottom: 30,
  },
  calcularButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  calcularButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  limpiarButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  limpiarButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  resultadoContainer: {
    marginBottom: 30,
  },
  resultadoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resultadoExito: {
    borderLeftWidth: 4,
    borderLeftColor: '#22C55E',
  },
  resultadoError: {
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  resultadoContent: {
    marginLeft: 16,
    flex: 1,
  },
  resultadoTitulo: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 4,
  },
  resultadoPeriodo: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  resultadoImpuesto: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#22C55E',
    marginBottom: 4,
  },
  resultadoDescripcion: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 8,
  },
  resultadoErrorText: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    color: '#EF4444',
    marginBottom: 4,
  },
  resultadoMensaje: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#EF4444',
  },
  detalleCalculo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  detalleTexto: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    marginBottom: 2,
  },
  infoAdicional: {
    marginBottom: 40,
  },
  consejoCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  consejoTitulo: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginBottom: 8,
  },
  consejoTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
});