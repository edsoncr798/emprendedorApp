import { useEffect, useState } from 'react';
import { RecordatoriosService, Recordatorio } from '../services/recordatoriosService';
import { useAuth } from '../contexts/AuthContext';
import { Audio } from 'expo-av';

function addMonths(date: Date, months: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getUTCDateOnly(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function isSameDayUTC(a: Date, b: Date) {
  const aUTC = getUTCDateOnly(a);
  const bUTC = getUTCDateOnly(b);
  return aUTC.getTime() === bUTC.getTime();
}

function isBeforeDayUTC(a: Date, b: Date) {
  const aUTC = getUTCDateOnly(a);
  const bUTC = getUTCDateOnly(b);
  return aUTC.getTime() < bUTC.getTime();
}

export function useRecordatoriosBadge() {
  const { user } = useAuth();
  const [recordatoriosCount, setRecordatoriosCount] = useState(0);
  const [hasPlayedSound, setHasPlayedSound] = useState(false);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = RecordatoriosService.subscribeToRecordatorios(
      user.uid,
      async (recordatorios: Recordatorio[]) => {
        const hoy = new Date();
        let cambios: Promise<void>[] = [];
        recordatorios.forEach(r => {
          if (!r.activo) return;
          const fecha = new Date(r.fechaVencimiento);
          // Solo actualizar si la fecha es menor a hoy (ya pasó)
          if (isBeforeDayUTC(fecha, hoy)) {
            // Ya venció (ayer o antes)
            if (r.tipo === 'único') {
              cambios.push(RecordatoriosService.updateRecordatorio(r.id!, { activo: false }));
            } else if (r.tipo === 'mensual') {
              const nuevaFecha = addMonths(fecha, 1);
              cambios.push(RecordatoriosService.updateRecordatorio(r.id!, { fechaVencimiento: nuevaFecha.toISOString() }));
            } else if (r.tipo === 'semanal') {
              const nuevaFecha = addDays(fecha, 7);
              cambios.push(RecordatoriosService.updateRecordatorio(r.id!, { fechaVencimiento: nuevaFecha.toISOString() }));
            } else if (r.tipo === 'anual') {
              const nuevaFecha = addMonths(fecha, 12);
              cambios.push(RecordatoriosService.updateRecordatorio(r.id!, { fechaVencimiento: nuevaFecha.toISOString() }));
            } else if (r.tipo === 'trimestral') {
              const nuevaFecha = addMonths(fecha, 3);
              cambios.push(RecordatoriosService.updateRecordatorio(r.id!, { fechaVencimiento: nuevaFecha.toISOString() }));
            }
          }
        });
        if (cambios.length > 0) await Promise.all(cambios);

        // Calcular cuántos recordatorios vencen HOY y están activos
        const vencenHoy = recordatorios.filter(r => {
          if (!r.activo) return false;
          const fecha = new Date(r.fechaVencimiento);
          return isSameDayUTC(fecha, hoy);
        });
        setRecordatoriosCount(vencenHoy.length);

        // Reproducir sonido si hay vencimientos hoy y aún no se ha reproducido
        if (vencenHoy.length > 0 && !hasPlayedSound) {
          playAlertSound();
          setHasPlayedSound(true);
        }
        // Resetear el flag si ya no hay vencimientos hoy
        if (vencenHoy.length === 0 && hasPlayedSound) {
          setHasPlayedSound(false);
        }
      }
    );
    return unsubscribe;
  }, [user, hasPlayedSound]);

  // Función para reproducir un sonido de alerta
  async function playAlertSound() {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sound/notify.mp3')
      );
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status: any) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      // Si no hay sonido, no hacer nada
    }
  }

  return { recordatoriosCount };
}