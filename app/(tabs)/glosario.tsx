import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { Search, BookOpen, Lightbulb } from 'lucide-react-native';

const glosarioTerminos = [
  {
    id: 1,
    termino: 'Ingresos',
    categoria: 'Básico',
    definicion: 'Todo el dinero que entra a tu negocio por ventas, servicios o cualquier otra fuente.',
    ejemplo: 'Si vendes S/ 500 en productos, esos S/ 500 son tus ingresos del día.',
    color: '#22C55E'
  },
  {
    id: 2,
    termino: 'Gastos',
    categoria: 'Básico',
    definicion: 'Todo el dinero que sale de tu negocio para operarlo: materiales, alquiler, servicios, etc.',
    ejemplo: 'Si pagas S/ 50 de luz y S/ 100 de materiales, tienes S/ 150 en gastos.',
    color: '#EF4444'
  },
  {
    id: 3,
    termino: 'Ganancia',
    categoria: 'Básico',
    definicion: 'Lo que te queda después de restar todos los gastos a tus ingresos. Es tu verdadero beneficio.',
    ejemplo: 'Si ingresas S/ 500 y gastas S/ 200, tu ganancia es S/ 300.',
    color: '#3B82F6'
  },
  {
    id: 4,
    termino: 'Capital',
    categoria: 'Básico',
    definicion: 'El dinero que tienes disponible para invertir en tu negocio o para operarlo.',
    ejemplo: 'Si tienes S/ 1000 para comprar mercadería, ese es tu capital.',
    color: '#8B5CF6'
  },
  {
    id: 5,
    termino: 'Flujo de Caja',
    categoria: 'Intermedio',
    definicion: 'El movimiento del dinero que entra y sale de tu negocio en un período de tiempo.',
    ejemplo: 'Si en enero entraron S/ 2000 y salieron S/ 1500, tu flujo de caja es positivo (+S/ 500).',
    color: '#F59E0B'
  },
  {
    id: 6,
    termino: 'Punto de Equilibrio',
    categoria: 'Intermedio',
    definicion: 'Cuando tus ingresos son exactamente iguales a tus gastos. No ganas ni pierdes.',
    ejemplo: 'Si necesitas vender 50 productos para cubrir todos tus gastos, ese es tu punto de equilibrio.',
    color: '#06B6D4'
  },
  {
    id: 7,
    termino: 'Margen de Ganancia',
    categoria: 'Intermedio',
    definicion: 'El porcentaje de ganancia que obtienes de cada venta.',
    ejemplo: 'Si compras un producto a S/ 10 y lo vendes a S/ 15, tu margen es 50%.',
    color: '#84CC16'
  },
  {
    id: 8,
    termino: 'Costos Fijos',
    categoria: 'Intermedio',
    definicion: 'Gastos que tienes que pagar siempre, vendas mucho o poco (alquiler, seguros, etc.).',
    ejemplo: 'El alquiler de tu local siempre es S/ 400, vendas S/ 100 o S/ 1000.',
    color: '#F97316'
  },
  {
    id: 9,
    termino: 'Costos Variables',
    categoria: 'Intermedio',
    definicion: 'Gastos que cambian según cuánto vendas (materiales, comisiones, etc.).',
    ejemplo: 'Si vendes más productos, necesitas comprar más materiales.',
    color: '#EF4444'
  },
  {
    id: 10,
    termino: 'Inventario',
    categoria: 'Básico',
    definicion: 'Todos los productos o materiales que tienes guardados para vender o usar.',
    ejemplo: 'Si tienes 20 polos, 15 pantalones y 10 zapatos, ese es tu inventario.',
    color: '#6366F1'
  },
  {
    id: 11,
    termino: 'ROI (Retorno de Inversión)',
    categoria: 'Avanzado',
    definicion: 'Cuánto dinero ganaste en comparación con lo que invertiste.',
    ejemplo: 'Si invertiste S/ 100 y ganaste S/ 30, tu ROI es 30%.',
    color: '#EC4899'
  },
  {
    id: 12,
    termino: 'Presupuesto',
    categoria: 'Básico',
    definicion: 'Un plan de cuánto dinero vas a gastar y en qué lo vas a gastar en un período.',
    ejemplo: 'Este mes planeas gastar S/ 300 en materiales y S/ 400 en alquiler.',
    color: '#10B981'
  },
  // Nuevos términos tributarios
  {
    id: 13,
    termino: 'RUS (Régimen Único Simplificado)',
    categoria: 'Tributario',
    definicion: 'Régimen tributario para pequeños negocios con ingresos limitados. Tiene cuotas fijas mensuales.',
    ejemplo: 'Si tus ingresos o gastos no pasan de S/ 5,000 mensuales, pagas S/ 20 al mes.',
    color: '#22C55E'
  },
  {
    id: 14,
    termino: 'RER (Régimen Especial de Renta)',
    categoria: 'Tributario',
    definicion: 'Régimen para negocios medianos. Pagas el 1.5% de tus ingresos netos mensuales.',
    ejemplo: 'Si tus ingresos netos son S/ 10,000, pagas S/ 150 de impuesto.',
    color: '#3B82F6'
  },
  {
    id: 15,
    termino: 'MYPE Tributario',
    categoria: 'Tributario',
    definicion: 'Régimen para micro y pequeñas empresas con diferentes tramos según ingresos anuales.',
    ejemplo: 'Si tus ingresos anuales no pasan de 300 UIT, pagas 1% mensual.',
    color: '#F59E0B'
  },
  {
    id: 16,
    termino: 'Régimen General',
    categoria: 'Tributario',
    definicion: 'Régimen sin límites de ingresos. Pagas 1.5% o coeficiente (el mayor) de ingresos mensuales.',
    ejemplo: 'Si tu coeficiente es 2% y el 1.5% da S/ 150, pagas el mayor: 2%.',
    color: '#8B5CF6'
  },
  {
    id: 17,
    termino: 'UIT (Unidad Impositiva Tributaria)',
    categoria: 'Tributario',
    definicion: 'Valor de referencia usado para calcular impuestos y multas. Se actualiza cada año.',
    ejemplo: 'En 2025, 1 UIT = S/ 5,150. Si el límite es 300 UIT, son S/ 1,545,000.',
    color: '#06B6D4'
  },
  {
    id: 18,
    termino: 'Coeficiente',
    categoria: 'Tributario',
    definicion: 'Porcentaje calculado del año anterior para determinar pagos a cuenta mensuales.',
    ejemplo: 'Si el año pasado pagaste S/ 1,200 de impuesto con ingresos de S/ 100,000, tu coeficiente es 1.2%.',
    color: '#EC4899'
  },
  {
    id: 19,
    termino: 'Ingresos Netos',
    categoria: 'Tributario',
    definicion: 'Los ingresos totales menos las devoluciones, descuentos y bonificaciones.',
    ejemplo: 'Si vendiste S/ 1,000 pero devolviste S/ 100, tus ingresos netos son S/ 900.',
    color: '#84CC16'
  },
  {
    id: 20,
    termino: 'Pagos a Cuenta',
    categoria: 'Tributario',
    definicion: 'Pagos mensuales anticipados del impuesto anual que debes hacer.',
    ejemplo: 'Cada mes pagas S/ 150 a cuenta. Al final del año se calcula si pagaste de más o de menos.',
    color: '#F97316'
  }
];

const categorias = ['Todos', 'Básico', 'Intermedio', 'Avanzado', 'Tributario'];

export default function GlosarioScreen() {
  const [busqueda, setBusqueda] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('Todos');

  const filtrarTerminos = () => {
    let terminosFiltrados = glosarioTerminos;

    if (categoriaSeleccionada !== 'Todos') {
      terminosFiltrados = terminosFiltrados.filter(t => t.categoria === categoriaSeleccionada);
    }

    if (busqueda) {
      terminosFiltrados = terminosFiltrados.filter(t => 
        t.termino.toLowerCase().includes(busqueda.toLowerCase()) ||
        t.definicion.toLowerCase().includes(busqueda.toLowerCase())
      );
    }

    return terminosFiltrados;
  };

  const terminosFiltrados = filtrarTerminos();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Glosario de Negocios</Text>
          <Text style={styles.subtitle}>Aprende términos importantes de forma sencilla</Text>
        </View>

        {/* Buscador */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#6B7280" />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar términos..."
            value={busqueda}
            onChangeText={setBusqueda}
          />
        </View>

        {/* Filtros por Categoría */}
        <View style={styles.filtrosContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoriasTabs}>
            {categorias.map((categoria) => (
              <TouchableOpacity
                key={categoria}
                style={[
                  styles.categoriaTab,
                  categoriaSeleccionada === categoria && styles.categoriaTabActive
                ]}
                onPress={() => setCategoriaSeleccionada(categoria)}
              >
                <Text style={[
                  styles.categoriaTabText,
                  categoriaSeleccionada === categoria && styles.categoriaTabTextActive
                ]}>
                  {categoria}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Lista de Términos */}
        <View style={styles.terminosList}>
          {terminosFiltrados.length === 0 ? (
            <View style={styles.emptyState}>
              <BookOpen size={48} color="#9CA3AF" />
              <Text style={styles.emptyStateText}>No se encontraron términos</Text>
              <Text style={styles.emptyStateSubtext}>
                Prueba con otros términos de búsqueda
              </Text>
            </View>
          ) : (
            terminosFiltrados.map((termino) => (
              <View key={termino.id} style={styles.terminoCard}>
                <View style={styles.terminoHeader}>
                  <View style={styles.terminoTitleContainer}>
                    <View style={[styles.terminoIndicador, { backgroundColor: termino.color }]} />
                    <Text style={styles.terminoTitulo}>{termino.termino}</Text>
                  </View>
                  <View style={[styles.categoriaTag, { borderColor: termino.color }]}>
                    <Text style={[styles.categoriaTagText, { color: termino.color }]}>
                      {termino.categoria}
                    </Text>
                  </View>
                </View>

                <Text style={styles.terminoDefinicion}>{termino.definicion}</Text>

                <View style={styles.ejemploContainer}>
                  <View style={styles.ejemploHeader}>
                    <Lightbulb size={16} color="#F59E0B" />
                    <Text style={styles.ejemploLabel}>Ejemplo práctico:</Text>
                  </View>
                  <Text style={styles.ejemploTexto}>{termino.ejemplo}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* Sección de Ayuda */}
        <View style={styles.ayudaContainer}>
          <Text style={styles.sectionTitle}>¿Necesitas más ayuda?</Text>
          
          <View style={styles.ayudaCard}>
            <Text style={styles.ayudaTitulo}>💬 Consejos para usar este glosario:</Text>
            <Text style={styles.ayudaTexto}>
              • Lee los términos básicos primero{'\n'}
              • Practica con los ejemplos en tu negocio{'\n'}
              • Usa el buscador para encontrar términos específicos{'\n'}
              • Los términos tributarios te ayudarán con impuestos
            </Text>
          </View>

          <View style={styles.ayudaCard}>
            <Text style={styles.ayudaTitulo}>🎯 Términos más importantes para empezar:</Text>
            <Text style={styles.ayudaTexto}>
              1. Ingresos - Todo lo que entra{'\n'}
              2. Gastos - Todo lo que sale{'\n'}
              3. Ganancia - Lo que realmente ganas{'\n'}
              4. RUS - Régimen tributario más simple
            </Text>
          </View>
        </View>

        {/* Estadísticas */}
        <View style={styles.estadisticasContainer}>
          <Text style={styles.sectionTitle}>📊 Aprende paso a paso</Text>
          
          <View style={styles.estadisticasGrid}>
            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>
                {glosarioTerminos.filter(t => t.categoria === 'Básico').length}
              </Text>
              <Text style={styles.estadisticaLabel}>Términos Básicos</Text>
              <Text style={styles.estadisticaSubtext}>Empieza aquí</Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>
                {glosarioTerminos.filter(t => t.categoria === 'Tributario').length}
              </Text>
              <Text style={styles.estadisticaLabel}>Tributarios</Text>
              <Text style={styles.estadisticaSubtext}>Para impuestos</Text>
            </View>

            <View style={styles.estadisticaCard}>
              <Text style={styles.estadisticaNumero}>
                {glosarioTerminos.filter(t => t.categoria === 'Avanzado').length}
              </Text>
              <Text style={styles.estadisticaLabel}>Avanzados</Text>
              <Text style={styles.estadisticaSubtext}>Para expertos</Text>
            </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
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
  filtrosContainer: {
    marginBottom: 20,
  },
  categoriasTabs: {
    flexDirection: 'row',
  },
  categoriaTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoriaTabActive: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  categoriaTabText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#6B7280',
  },
  categoriaTabTextActive: {
    color: '#FFFFFF',
  },
  terminosList: {
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
  },
  terminoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  terminoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  terminoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  terminoIndicador: {
    width: 4,
    height: 24,
    borderRadius: 2,
    marginRight: 12,
  },
  terminoTitulo: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    color: '#1F2937',
    flex: 1,
  },
  categoriaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoriaTagText: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
  },
  terminoDefinicion: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    color: '#374151',
    lineHeight: 24,
    marginBottom: 16,
  },
  ejemploContainer: {
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  ejemploHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  ejemploLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    color: '#92400E',
    marginLeft: 6,
  },
  ejemploTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#92400E',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    color: '#1F2937',
    marginBottom: 16,
  },
  ayudaContainer: {
    marginBottom: 30,
  },
  ayudaCard: {
    backgroundColor: '#F0F9FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#0EA5E9',
  },
  ayudaTitulo: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#0C4A6E',
    marginBottom: 8,
  },
  ayudaTexto: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#0C4A6E',
    lineHeight: 20,
  },
  estadisticasContainer: {
    marginBottom: 40,
  },
  estadisticasGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  estadisticaCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
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
  estadisticaNumero: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#3B82F6',
    marginBottom: 4,
  },
  estadisticaLabel: {
    fontSize: 12,
    fontFamily: 'Inter-SemiBold',
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 2,
  },
  estadisticaSubtext: {
    fontSize: 10,
    fontFamily: 'Inter-Regular',
    color: '#9CA3AF',
    textAlign: 'center',
  },
});