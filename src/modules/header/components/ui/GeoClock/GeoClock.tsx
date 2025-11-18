'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useTheme } from '@/contexts/ThemeContext';
import styles from './GeoClock.module.scss';

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

interface GeoClockProps {}

const GeoClock: React.FC<GeoClockProps> = () => {
  const { isDarkMode } = useTheme();
  const [time, setTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('Cargando...');
  const [temperature, setTemperature] = useState('Cargando...');
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);

  /* ────────────────────────────────────────────
     EFFECTS – CLOCK AND WEATHER LOGIC
  ──────────────────────────────────────────── */
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
    }, 1000);

    // Función para obtener clima y ubicación
    const fetchWeatherAndLocation = async () => {
      // Detectar si es desktop
      const isDesktop = () => {
        if (typeof window === 'undefined') return false;
        const ua = navigator.userAgent;
        return !/Mobi|Android|iPhone|iPad|iPod|Mobile|Tablet/i.test(ua);
      };

      if (!isDesktop()) {
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }

      // Verificar permisos de geolocalización
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
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }

      if (!navigator.geolocation) {
        setLocation('No disponible');
        setTemperature('N/A');
        setWeatherIcon(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Obtener ciudad desde Google Maps API
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

              // Obtener clima desde OpenWeather API
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
                        return isDaytime ? '/weather/CoolDay.svg' : '/weather/CoolNight.svg';
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
                          return isDaytime ? '/weather/CoolDay.svg' : '/weather/CoolNight.svg';
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
          setLocation('No disponible');
          setTemperature('N/A');
          setWeatherIcon(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Obtener clima al montar y cada 15 minutos
    fetchWeatherAndLocation();
    const weatherInterval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        fetchWeatherAndLocation();
      }
    }, 15 * 60 * 1000); // 15 minutos

    return () => {
      clearInterval(timer);
      clearInterval(weatherInterval);
    };
  }, []);

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
    </div>
  );
};

export default GeoClock;
