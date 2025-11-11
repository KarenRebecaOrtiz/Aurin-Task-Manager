'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import { PersonalLocation } from '../../../types';
import styles from './GeoClock.module.scss';

// Coordenadas de la oficina y radio
const OFFICE_LOCATION = {
  lat: 18.939038706258508,
  lng: -99.2468563357126,
};
const OFFICE_RADIUS = 500; // Radio en metros


// const OFFICE_HOURS = {
//  start: 9, // 9:00 AM
//  end: 18, // 6:00 PM
// };

// Fallback location (Cuernavaca as default)
const FALLBACK_LOCATION = {
  lat: 18.9261,
  lng: -99.2308,
  name: 'Cuernavaca',
};

// Interfaz para componentes de dirección de Google Maps
interface AddressComponent {
  long_name: string;
  types: string[];
}

// Función para calcular la distancia (Haversine)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
};

// Función para verificar si está dentro del horario de oficina (lunes a viernes)
// const isOfficeHours = (date: Date): boolean => {
//   const cdmxTime = new Date(
//     date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }),
//   );
//   const hours = cdmxTime.getHours();
//   const day = cdmxTime.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
//   // Solo lunes a viernes (1 a 5)
//   if (day === 0 || day === 6) {
//     return false;
//   }
//   return hours >= OFFICE_HOURS.start && hours < OFFICE_HOURS.end;
// };

interface GeoClockProps {
  personalLocations?: {
    home?: PersonalLocation;
    secondary?: PersonalLocation;
  };
}

const GeoClock: React.FC<GeoClockProps> = ({ personalLocations }) => {
  const { isDarkMode } = useTheme();
  const [time, setTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('Cargando...');
  const [temperature, setTemperature] = useState('Cargando...');
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [officeStatus, setOfficeStatus] = useState<string>('Cargando...');

  /* ────────────────────────────────────────────
     EFFECTS – CLOCK AND LOCATION LOGIC (HEARTBEAT)
  ──────────────────────────────────────────── */
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      const now = new Date();
                      setTime(now);
    }, 1000);

    // Detectar si es desktop (predominante) o mobile
    const isDesktop = () => {
      if (typeof window === 'undefined') return false;
      const ua = navigator.userAgent;
      return !/Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
    };

    // Heartbeat para saber si hay alguna pestaña desktop abierta
    const HEARTBEAT_KEY = 'officeStatusDesktopHeartbeat';
    const HEARTBEAT_INTERVAL = 10000; // 10 segundos
    const HEARTBEAT_TTL = 30000; // 30 segundos
    let heartbeatTimer: NodeJS.Timeout | null = null;
    let locationInterval: NodeJS.Timeout | null = null;
    let lastVisibility = document.visibilityState;

    // Escribe heartbeat en localStorage
    const writeHeartbeat = () => {
      if (isDesktop()) {
        localStorage.setItem(HEARTBEAT_KEY, Date.now().toString());
      }
    };

    // Verifica si hay heartbeat reciente
    const hasRecentHeartbeat = () => {
      const last = parseInt(localStorage.getItem(HEARTBEAT_KEY) || '0', 10);
      return Date.now() - last < HEARTBEAT_TTL;
    };

    // Refresca officeStatus según heartbeat y ubicación
    const refreshOfficeStatus = async () => {
      if (!isDesktop()) {
        setOfficeStatus('No disponible');
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }
      if (!hasRecentHeartbeat()) {
        setOfficeStatus('No disponible');
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }
      const permission = await (async () => {
        if (typeof window === 'undefined' || !navigator.permissions) return 'unknown';
        try {
          const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
          return permissionStatus.state;
        } catch {
          return 'unknown';
        }
      })();
      if (permission === 'denied') {
        setOfficeStatus('No disponible');
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }
      if (!navigator.geolocation) {
        setOfficeStatus('No disponible');
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          // Detectar ubicación actual
          let currentLocation = 'Fuera';
          
          // Verificar si está en la oficina
          const officeDistance = calculateDistance(
            latitude,
            longitude,
            OFFICE_LOCATION.lat,
            OFFICE_LOCATION.lng,
          );
          
          if (officeDistance <= OFFICE_RADIUS) {
            currentLocation = 'En la oficina';
          } else {
            // Verificar ubicaciones personalizadas
            if (personalLocations?.home) {
              const homeDistance = calculateDistance(
                latitude,
                longitude,
                personalLocations.home.lat,
                personalLocations.home.lng,
              );
              if (homeDistance <= personalLocations.home.radius) {
                currentLocation = 'En casa';
              }
            }
            
            if (currentLocation === 'Fuera' && personalLocations?.secondary) {
              const secondaryDistance = calculateDistance(
                latitude,
                longitude,
                personalLocations.secondary.lat,
                personalLocations.secondary.lng,
              );
              if (secondaryDistance <= personalLocations.secondary.radius) {
                currentLocation = `En ${personalLocations.secondary.name}`;
              }
            }
          }
          
          setOfficeStatus(currentLocation);
          try {
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
            );
            if (!response.ok) throw new Error();
            const data = await response.json();
            if (data.status === 'OK' && data.results.length > 0) {
              const result = data.results[0];
              const city = result.address_components.find((comp: AddressComponent) =>
                comp.types.includes('locality'),
              )?.long_name || FALLBACK_LOCATION.name;
              setLocation(city);
              try {
                const weatherResponse = await fetch(
                  `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&units=metric&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`,
                );
                if (!weatherResponse.ok) throw new Error();
                const weatherData = await weatherResponse.json();
                if (weatherData.main && typeof weatherData.main.temp === 'number') {
                  setTemperature(`${Math.round(weatherData.main.temp)}°`);
                  const weatherMain = weatherData.weather[0].main.toLowerCase();
                  const weatherDescription = weatherData.weather[0].description.toLowerCase();
                  // Usar la zona horaria de México para determinar si es día o noche
                  const currentTime = new Date();
                  const mexicoTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }));
                  const currentHour = mexicoTime.getHours();
                  
                  const icon = (() => {
                    // Función helper para determinar si es día o noche
                    const isDaytime = currentHour >= 6 && currentHour < 18;
                    
                    // Primero intentar con weatherMain
                    switch (weatherMain) {
                      case 'clouds': 
                      case 'cloudy': 
                        return '/weather/Cloudy.svg';
                      case 'clear':
                      case 'sunny':
                        const clearIcon = isDaytime ? '/weather/CoolDay.svg' : '/weather/CoolNight.svg';
                        return clearIcon;
                      case 'rain': 
                      case 'drizzle':
                      case 'shower rain':
                        return '/weather/Rainy.svg';
                      case 'snow': 
                      case 'sleet':
                        return '/weather/Snowy.svg';
                      case 'thunderstorm': 
                      case 'storm':
                        return '/weather/Storm.svg';
                      case 'windy':
                      case 'gust':
                      case 'wind':
                        return '/weather/Windy.svg';
                      default: 
                        // Si no coincide con weatherMain, intentar con weatherDescription
                        if (weatherDescription.includes('clear') || weatherDescription.includes('sunny')) {
                          const clearIcon = isDaytime ? '/weather/CoolDay.svg' : '/weather/CoolNight.svg';
                          return clearIcon;
                        }
                        if (weatherDescription.includes('cloud')) {
                          return '/weather/Cloudy.svg';
                        }
                        if (weatherDescription.includes('rain') || weatherDescription.includes('drizzle')) {
                          return '/weather/Rainy.svg';
                        }
                        if (weatherDescription.includes('snow')) {
                          return '/weather/Snowy.svg';
                        }
                        if (weatherDescription.includes('thunder') || weatherDescription.includes('storm')) {
                          return '/weather/Storm.svg';
                        }
                        if (weatherDescription.includes('wind')) {
                          return '/weather/Windy.svg';
                        }
                        
                        // Fallback: si no se encuentra coincidencia, usar nublado como default
                        return '/weather/Cloudy.svg';
                    }
                  })();
                  setWeatherIcon(icon);
                }
              } catch {
                setTemperature('N/A');
                setWeatherIcon(null);
              }
            }
          } catch {
            setLocation(FALLBACK_LOCATION.name);
            setTemperature('N/A');
            setWeatherIcon(null);
          }
        },
        () => {
          setOfficeStatus('No disponible');
          setLocation('No disponible');
          setTemperature('N/A');
          setWeatherIcon(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Heartbeat: cada 10s si desktop
    if (isDesktop()) {
      writeHeartbeat();
      heartbeatTimer = setInterval(writeHeartbeat, HEARTBEAT_INTERVAL);
    }

    // Refresca al montar y cada 15 minutos si la pestaña está activa
    const setupLocationInterval = () => {
      refreshOfficeStatus();
      if (locationInterval) clearInterval(locationInterval);
      locationInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          refreshOfficeStatus();
        }
      }, 15 * 60 * 1000); // 15 minutos
    };
    setupLocationInterval();

    // Escucha cambios de storage (heartbeat de otras pestañas)
    const onStorage = (e: StorageEvent) => {
      if (e.key === HEARTBEAT_KEY) {
        refreshOfficeStatus();
      }
    };
    window.addEventListener('storage', onStorage);

    // Pausar/continuar refresco según visibilidad de la pestaña
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && lastVisibility !== 'visible') {
        refreshOfficeStatus();
      }
      lastVisibility = document.visibilityState;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(timer);
      if (heartbeatTimer) clearInterval(heartbeatTimer);
      if (locationInterval) clearInterval(locationInterval);
      window.removeEventListener('storage', onStorage);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [personalLocations?.home, personalLocations?.secondary]);

  const date = time
    ? time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const formattedTime = time
    ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  const handleWeatherIconMouseEnter = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1.2)';
    e.currentTarget.style.filter =
      'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.88)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
  }, []);

  const handleWeatherIconMouseLeave = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    e.currentTarget.style.transform = 'scale(1)';
    e.currentTarget.style.filter =
      'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
  }, []);

  return (
    <div className={styles.Clock}>
      <div
        style={{ fontSize: '10px', fontFamily: 'Inconsolata, monospace' }}
        className="ClockDate"
      >
        {date}
      </div>
      <div
        style={{
          fontSize: '10px',
          fontWeight: '600',
          fontFamily: 'Inconsolata, monospace',
        }}
        className="ClockTime"
      >
        {formattedTime}
      </div>
      <div
        style={{
          alignItems: 'flex-start',
          display: 'flex',
          fontSize: '10px',
          fontFamily: 'Inconsolata, monospace',
        }}
        className="ClockTemperature"
      >
        {location} {temperature}
        {weatherIcon && (
          <Image
            src={weatherIcon}
            draggable="false"
            alt="Ícono del clima"
            width={15}
            height={15}
            priority
            style={{
              marginLeft: '5px',
              transition: 'transform 0.3s ease, filter 0.3s ease',
              filter:
                'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
            }}
            onMouseEnter={handleWeatherIconMouseEnter}
            onMouseLeave={handleWeatherIconMouseLeave}
          />
        )}
      </div>
      <div 
        style={{
          fontSize: '10px',
          fontFamily: 'Inconsolata, monospace',
                        color:
                officeStatus === 'En la oficina'
                  ? '#28a745'
                  : officeStatus === 'En casa'
                  ? '#3b82f6'
                  : officeStatus.startsWith('En ')
                  ? '#8b5cf6'
                  : isDarkMode ? '#ff6f00' : '#dc3545',
        }}
        className={styles.ClockOfficeStatuHidden}
      >
        {officeStatus}
      </div>
    </div>
  );
};

export default GeoClock; 