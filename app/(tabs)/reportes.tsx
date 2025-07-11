import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, Download, ChartBar as BarChart3 } from 'lucide-react-native';
import { useAuth } from '../../contexts/AuthContext';
import { MovimientosService, Movimiento } from '../../services/movimientosService';
import { Redirect } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

export default function ReportesScreen() {
  const { user, loading } = useAuth();
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [mesSeleccionado, setMesSeleccionado] = useState(() => new Date().getMonth());
  const [anoSeleccionado, setAnoSeleccionado] = useState(() => new Date().getFullYear());
  const [loadingData, setLoadingData] = useState(true);

  // Al montar el componente, siempre apunta al mes y año actual
  useEffect(() => {
    setMesSeleccionado(new Date().getMonth());
    setAnoSeleccionado(new Date().getFullYear());
  }, []);

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

  // Filtrar movimientos por mes y año seleccionado
  const movimientosFiltrados = movimientos.filter(movimiento => {
    const fecha = new Date(movimiento.fecha);
    return fecha.getMonth() === mesSeleccionado && fecha.getFullYear() === anoSeleccionado;
  });

  // Calcular estadísticas del período
  const calcularEstadisticas = () => {
    const ingresos = movimientosFiltrados.filter(m => m.tipo === 'ingreso');
    const gastos = movimientosFiltrados.filter(m => m.tipo === 'gasto');
    
    const totalIngresos = ingresos.reduce((sum, m) => sum + m.monto, 0);
    const totalGastos = gastos.reduce((sum, m) => sum + m.monto, 0);
    const ganancia = totalIngresos - totalGastos;

    // Calcular días únicos con movimientos
    const fechasUnicas = new Set(movimientosFiltrados.map(m => m.fecha));
    const diasOperativos = fechasUnicas.size;

    const promedioIngresosDiario = diasOperativos > 0 ? totalIngresos / diasOperativos : 0;

    return {
      totalIngresos,
      totalGastos,
      ganancia,
      diasOperativos,
      promedioIngresosDiario,
      totalMovimientos: movimientosFiltrados.length
    };
  };

  // Analizar categorías
  const analizarCategorias = () => {
    const ingresos = movimientosFiltrados.filter(m => m.tipo === 'ingreso');
    const gastos = movimientosFiltrados.filter(m => m.tipo === 'gasto');

    const categoriasIngresos: { [key: string]: number } = {};
    const categoriasGastos: { [key: string]: number } = {};

    ingresos.forEach(m => {
      categoriasIngresos[m.categoria] = (categoriasIngresos[m.categoria] || 0) + m.monto;
    });

    gastos.forEach(m => {
      categoriasGastos[m.categoria] = (categoriasGastos[m.categoria] || 0) + m.monto;
    });

    const totalIngresos = Object.values(categoriasIngresos).reduce((sum, val) => sum + val, 0);
    const totalGastos = Object.values(categoriasGastos).reduce((sum, val) => sum + val, 0);

    const topIngresos = Object.entries(categoriasIngresos)
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: totalIngresos > 0 ? Math.round((monto / totalIngresos) * 100) : 0
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 3);

    const topGastos = Object.entries(categoriasGastos)
      .map(([categoria, monto]) => ({
        categoria,
        monto,
        porcentaje: totalGastos > 0 ? Math.round((monto / totalGastos) * 100) : 0
      }))
      .sort((a, b) => b.monto - a.monto)
      .slice(0, 3);

    return { topIngresos, topGastos };
  };

  // Generar consejos personalizados
  const generarConsejos = () => {
    const stats = calcularEstadisticas();
    const { topIngresos, topGastos } = analizarCategorias();
    const consejos = [];

    if (stats.ganancia > 0) {
      consejos.push({
        titulo: '¡Excelente mes!',
        texto: `Tuviste una ganancia de ${formatCurrency(stats.ganancia)}. Sigue así y considera ahorrar parte de estas ganancias.`
      });
    } else if (stats.ganancia < 0) {
      consejos.push({
        titulo: 'Revisa tus gastos',
        texto: `Este mes tuviste pérdidas de ${formatCurrency(Math.abs(stats.ganancia))}. Analiza tus gastos más grandes y busca formas de reducirlos.`
      });
    }

    if (topIngresos.length > 0) {
      const principal = topIngresos[0];
      consejos.push({
        titulo: 'Tu fuerte',
        texto: `${principal.categoria} representa el ${principal.porcentaje}% de tus ingresos. Es tu principal fuente, mantén el enfoque aquí.`
      });
    }

    if (topGastos.length > 0) {
      const mayorGasto = topGastos[0];
      consejos.push({
        titulo: 'Mayor gasto',
        texto: `${mayorGasto.categoria} es tu mayor gasto (${mayorGasto.porcentaje}% del total). Evalúa si puedes optimizar estos costos.`
      });
    }

    return consejos;
  };

  // Función para convertir movimientos a CSV
  const movimientosToCSV = (movimientos: Movimiento[]) => {
    const header = 'Fecha,Tipo,Categoría,Concepto,Monto';
    const rows = movimientos.map(m =>
      [
        new Date(m.fecha).toLocaleDateString('es-PE'),
        m.tipo,
        m.categoria,
        m.concepto,
        m.monto.toFixed(2)
      ].join(',')
    );
    return [header, ...rows].join('\n');
  };

  // Función para generar HTML del reporte
  const movimientosToHTML = (movimientos: Movimiento[]) => {
    const rows = movimientos.map(m => `
      <tr>
        <td>${new Date(m.fecha).toLocaleDateString('es-PE')}</td>
        <td>${m.tipo}</td>
        <td>${m.categoria}</td>
        <td>${m.concepto}</td>
        <td style="text-align:right">S/ ${m.monto.toFixed(2)}</td>
      </tr>
    `).join('');
    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { color: #3B82F6; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #E5E7EB; padding: 8px; font-size: 14px; }
            th { background: #F3F4F6; }
            tr:nth-child(even) { background: #F9FAFB; }
          </style>
        </head>
        <body>
          <h1>Reporte de Movimientos</h1>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Concepto</th>
                <th>Monto</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </body>
      </html>
    `;
  };

  // Función para exportar y compartir el PDF
  const exportarPDF = async () => {
    try {
      const html = movimientosToHTML(movimientosFiltrados);
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Compartir reporte PDF',
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('Error al exportar el reporte: ' + msg);
    }
  };

  // Función para exportar y compartir el CSV
  const exportarCSV = async () => {
    try {
      const csv = movimientosToCSV(movimientosFiltrados);
      const fileUri = FileSystem.cacheDirectory + `reporte_${Date.now()}.csv`;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Compartir reporte CSV',
        UTI: 'public.comma-separated-values-text',
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      alert('Error al exportar el reporte: ' + msg);
    }
  };

  if (loading || loadingData) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Cargando reportes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const estadisticas = calcularEstadisticas();
  const { topIngresos, topGastos } = analizarCategorias();
  const consejos = generarConsejos();

  // Redirect to login if not authenticated
  if (!loading && !user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Mis Reportes</Text>
          <Text style={styles.subtitle}>Analiza el desempeño de tu negocio</Text>
        </View>

        {/* Selector de Período */}
        <View style={styles.periodoSelector}>
          <Text style={styles.sectionTitle}>Período</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mesesContainer}>
            {meses.map((mes, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.mesButton,
                  mesSeleccionado === index && styles.mesButtonActive
                ]}
                onPress={() => setMesSeleccionado(index)}
              >
                <Calendar size={16} color={mesSeleccionado === index ? '#FFFFFF' : '#6B7280'} />
                <Text style={[
                  styles.mesButtonText,
                  mesSeleccionado === index && styles.mesButtonTextActive
                ]}>{mes} {anoSeleccionado}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {movimientosFiltrados.length === 0 ? (
          <View style={styles.emptyState}>
            <BarChart3 size={64} color="#9CA3AF" />
            <Text style={styles.emptyStateText}>No hay datos para este período</Text>
            <Text style={styles.emptyStateSubtext}>
              Registra algunos movimientos en {meses[mesSeleccionado].toLowerCase()} para ver tu reporte
            </Text>
          </View>
        ) : (
          <>
            {/* Resumen Ejecutivo */}
            <View style={styles.resumenContainer}>
              <Text style={styles.sectionTitle}>Resumen del Mes</Text>
              
              <View style={styles.resumenCard}>
                <View style={styles.resumenPrincipal}>
                  <Text style={styles.resumenLabel}>Ganancia Total</Text>
                  <Text style={[
                    styles.resumenMonto,
                    estadisticas.ganancia >= 0 ? styles.gananciasPositivas : styles.gananciasNegativas
                  ]}>
                    {formatCurrency(estadisticas.ganancia)}
                  </Text>
                  <Text style={styles.resumenSubtext}>
                    {estadisticas.ganancia >= 0 ? '¡Excelente mes!' : 'Necesitas revisar gastos'}
                  </Text>
                </View>

                <View style={styles.resumenDetalles}>
                  <View style={styles.resumenDetalle}>
                    <TrendingUp size={20} color="#22C55E" />
                    <View style={styles.resumenDetalleTexto}>
                      <Text style={styles.resumenDetalleLabel}>Ingresos</Text>
                      <Text style={styles.resumenDetalleMonto}>{formatCurrency(estadisticas.totalIngresos)}</Text>
                    </View>
                  </View>

                  <View style={styles.resumenDetalle}>
                    <TrendingDown size={20} color="#EF4444" />
                    <View style={styles.resumenDetalleTexto}>
                      <Text style={styles.resumenDetalleLabel}>Gastos</Text>
                      <Text style={styles.resumenDetalleMonto}>{formatCurrency(estadisticas.totalGastos)}</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Estadísticas Clave */}
            <View style={styles.estadisticasContainer}>
              <Text style={styles.sectionTitle}>Estadísticas Clave</Text>
              
              <View style={styles.estadisticasGrid}>
                <View style={styles.estadisticaCard}>
                  <Text style={styles.estadisticaNombre}>Días Activos</Text>
                  <Text style={styles.estadisticaValor}>{estadisticas.diasOperativos}</Text>
                  <Text style={styles.estadisticaSubtext}>días con movimientos</Text>
                </View>

                <View style={styles.estadisticaCard}>
                  <Text style={styles.estadisticaNombre}>Promedio Diario</Text>
                  <Text style={styles.estadisticaValor}>{formatCurrency(estadisticas.promedioIngresosDiario)}</Text>
                  <Text style={styles.estadisticaSubtext}>en ingresos</Text>
                </View>

                <View style={styles.estadisticaCard}>
                  <Text style={styles.estadisticaNombre}>Movimientos</Text>
                  <Text style={styles.estadisticaValor}>{estadisticas.totalMovimientos}</Text>
                  <Text style={styles.estadisticaSubtext}>registrados</Text>
                </View>
              </View>
            </View>

            {/* Análisis por Categorías - Ingresos */}
            {topIngresos.length > 0 && (
              <View style={styles.categoriasContainer}>
                <Text style={styles.sectionTitle}>🎯 Mis Mejores Fuentes de Ingresos</Text>
                
                {topIngresos.map((categoria, index) => (
                  <View key={index} style={styles.categoriaCard}>
                    <View style={styles.categoriaInfo}>
                      <Text style={styles.categoriaNombre}>{categoria.categoria}</Text>
                      <Text style={styles.categoriaMonto}>{formatCurrency(categoria.monto)}</Text>
                    </View>
                    <View style={styles.categoriaBarContainer}>
                      <View 
                        style={[
                          styles.categoriaBar,
                          styles.categoriaBarIngreso,
                          { width: `${categoria.porcentaje}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.categoriaPorcentaje}>{categoria.porcentaje}% del total</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Análisis por Categorías - Gastos */}
            {topGastos.length > 0 && (
              <View style={styles.categoriasContainer}>
                <Text style={styles.sectionTitle}>💰 En Qué Más Gasto</Text>
                
                {topGastos.map((categoria, index) => (
                  <View key={index} style={styles.categoriaCard}>
                    <View style={styles.categoriaInfo}>
                      <Text style={styles.categoriaNombre}>{categoria.categoria}</Text>
                      <Text style={styles.categoriaMonto}>{formatCurrency(categoria.monto)}</Text>
                    </View>
                    <View style={styles.categoriaBarContainer}>
                      <View 
                        style={[
                          styles.categoriaBar,
                          styles.categoriaBarGasto,
                          { width: `${categoria.porcentaje}%` }
                        ]} 
                      />
                    </View>
                    <Text style={styles.categoriaPorcentaje}>{categoria.porcentaje}% del total</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Consejos Personalizados */}
            {consejos.length > 0 && (
              <View style={styles.consejosContainer}>
                <Text style={styles.sectionTitle}>💡 Consejos Personalizados</Text>
                
                {consejos.map((consejo, index) => (
                  <View key={index} style={styles.consejoCard}>
                    <Text style={styles.consejoTitulo}>{consejo.titulo}</Text>
                    <Text style={styles.consejoTexto}>{consejo.texto}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Botón de Exportar */}
            <View style={styles.exportContainer}>
              <TouchableOpacity style={styles.exportButton} onPress={exportarCSV}>
                <Text style={styles.exportButtonText}>Descargar CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.exportButton} onPress={exportarPDF}>
                <Text style={styles.exportButtonText}>Descargar PDF</Text>
              </TouchableOpacity>
              <Text style={styles.exportSubtext}>
                Guarda este reporte para llevarlo a tu contador o revisar más tarde
              </Text>
            </View>
          </>
        )}
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
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyStateText: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  resumenContainer: {
    marginBottom: 30,
  },
  resumenCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resumenPrincipal: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  resumenLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
  },
  resumenMonto: {
    fontSize: 36,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  gananciasPositivas: {
    color: '#22C55E',
  },
  gananciasNegativas: {
    color: '#EF4444',
  },
  resumenSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
  },
  resumenDetalles: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resumenDetalle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  resumenDetalleTexto: {
    alignItems: 'center',
  },
  resumenDetalleLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 4,
  },
  resumenDetalleMonto: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  estadisticasContainer: {
    marginBottom: 30,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  estadisticaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
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
  estadisticaNombre: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
    marginBottom: 8,
    textAlign: 'center',
  },
  estadisticaValor: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  estadisticaSubtext: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
  categoriasContainer: {
    marginBottom: 30,
  },
  categoriaCard: {
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
  categoriaInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoriaNombre: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#1F2937',
    flex: 1,
  },
  categoriaMonto: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
  },
  categoriaBarContainer: {
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    height: 8,
    marginBottom: 8,
  },
  categoriaBar: {
    height: 8,
    borderRadius: 4,
  },
  categoriaBarIngreso: {
    backgroundColor: '#22C55E',
  },
  categoriaBarGasto: {
    backgroundColor: '#EF4444',
  },
  categoriaPorcentaje: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'right',
  },
  consejosContainer: {
    marginBottom: 30,
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
    marginBottom: 4,
  },
  consejoTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
  },
  exportContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  exportButton: {
    backgroundColor: '#3B82F6',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  exportButtonText: {
    color: '#fff',
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
  },
  exportSubtext: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});