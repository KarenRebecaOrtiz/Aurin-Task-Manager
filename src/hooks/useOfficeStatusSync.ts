import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useOnlineStatus } from './useOnlineStatus';

// Configuración de oficina (ajustar según tu ubicación)
const OFFICE_COORDS = {
  lat: 19.4326, // Coordenadas de CDMX (ajustar a tu oficina)
  lng: -99.1332
};

const OFFICE_RADIUS = 5000; // 5km de radio
const OFFICE_HOURS = {
  start: 8, // 8 AM
  end: 18   // 6 PM
};

export const useOfficeStatusSync = () => {
  const { user } = useUser();
  const { updateStatus } = useOnlineStatus();
  const [officeStatus, setOfficeStatus] = useState('Cargando...');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Función para calcular distancia entre dos puntos
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distancia en km
  };

  // Función para verificar si estamos en horario de oficina
  const isOfficeHours = (date: Date): boolean => {
    const hour = date.getHours();
    return hour >= OFFICE_HOURS.start && hour < OFFICE_HOURS.end;
  };

  // Función para obtener ubicación
  const getLocation = (): Promise<{ lat: number; lng: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocalización no soportada'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(coords);
          resolve(coords);
        },
        (error) => {
          console.error('Error obteniendo ubicación:', error);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutos
        }
      );
    });
  };

  // Función principal para verificar estado de oficina
  const checkOfficeStatus = async () => {
    try {
      if (!user?.id) return;

      const now = new Date();
      const coords = await getLocation();
      
      const distance = calculateDistance(
        coords.lat, 
        coords.lng, 
        OFFICE_COORDS.lat, 
        OFFICE_COORDS.lng
      );

      const inOfficeHours = isOfficeHours(now);
      const inOfficeRadius = distance <= OFFICE_RADIUS / 1000; // Convertir a km

      let newOfficeStatus = 'En oficina';
      let shouldUpdateStatus = false;

      if (!inOfficeHours) {
        newOfficeStatus = 'Fuera de horario';
        shouldUpdateStatus = true;
      } else if (!inOfficeRadius) {
        newOfficeStatus = 'Fuera de oficina';
        shouldUpdateStatus = true;
      }

      setOfficeStatus(newOfficeStatus);

      // Actualizar en Firestore
      await updateDoc(doc(db, 'users', user.id), { 
        officeStatus: newOfficeStatus,
        lastLocationCheck: now.toISOString(),
        officeDistance: distance
      });

      // Si está fuera de oficina/horario, actualizar status principal
      if (shouldUpdateStatus) {
        await updateStatus('Fuera', false);
      }

      console.log(`🏢 Estado de oficina: ${newOfficeStatus} (${distance.toFixed(2)}km de distancia)`);

    } catch (error) {
      console.error('Error verificando estado de oficina:', error);
      setOfficeStatus('Error al verificar ubicación');
    }
  };

  useEffect(() => {
    if (!user?.id) return;

    // Verificar estado inicial
    checkOfficeStatus();

    // Verificar cada 15 minutos
    const interval = setInterval(checkOfficeStatus, 15 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.id]);

  return { 
    officeStatus, 
    location,
    checkOfficeStatus 
  };
};
