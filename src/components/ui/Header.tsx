'use client';

import { useUser } from '@clerk/nextjs';
import ThemeToggler from '@/components/ui/ThemeToggler';
import AdviceInput from '@/components/ui/AdviceInput';
import styles from './Header.module.scss';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import AvatarDropdown from '../AvatarDropdown';

// Coordenadas de la oficina y radio
const OFFICE_LOCATION = {
  lat: 18.939038706258508,
  lng: -99.2468563357126,
};
const OFFICE_RADIUS = 500; // Radio en metros
const OFFICE_HOURS = {
  start: 9, // 9:00 AM
  end: 18, // 6:00 PM
};

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
const isOfficeHours = (date: Date): boolean => {
  const cdmxTime = new Date(
    date.toLocaleString('en-US', { timeZone: 'America/Mexico_City' }),
  );
  const hours = cdmxTime.getHours();
  const day = cdmxTime.getDay(); // 0 = domingo, 1 = lunes, ..., 6 = sábado
  // Solo lunes a viernes (1 a 5)
  if (day === 0 || day === 6) {
    return false;
  }
  return hours >= OFFICE_HOURS.start && hours < OFFICE_HOURS.end;
};

// Función para detectar el navegador
const getBrowserInfo = () => {
  const ua = navigator.userAgent;
  return {
    isArc: ua.includes('Arc'),
    isChrome: ua.includes('Chrome') && !ua.includes('Edge'),
    userAgent: ua,
  };
};

interface Notification {
  id: string;
  userId: string;
  taskId?: string;
  message: string;
  timestamp: Timestamp;
  read: boolean;
  recipientId: string;
  conversationId?: string;
  type?: string;
}

interface HeaderProps {
  selectedContainer: 'tareas' | 'cuentas' | 'miembros' | 'config';
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onDeleteNotification: (notificationId: string) => void;
  onLimitNotifications: (notifications: Notification[]) => void;
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
  isAdmin: boolean;
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  users,
  notifications,
  onNotificationClick,
  onDeleteNotification,
  onLimitNotifications,
  onChangeContainer,
  isAdmin,
}) => {
  const { user, isLoaded } = useUser();
  const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';

  /* ────────────────────────────────────────────
     REFS
  ──────────────────────────────────────────── */
  const welcomeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevNotificationsRef = useRef<Notification[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [time, setTime] = useState<Date | null>(null);
  const [location, setLocation] = useState('Cargando...');
  const [temperature, setTemperature] = useState('Cargando...');
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null);
  const [officeStatus, setOfficeStatus] = useState<string>('Cargando...');
  const [scrollPosition, setScrollPosition] = useState(0);

  /* ────────────────────────────────────────────
     EFFECTS – AUDIO INIT
  ──────────────────────────────────────────── */
  useEffect(() => {
    audioRef.current = new Audio('/NotificationSound.mp3');
    return () => audioRef.current?.pause();
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – USER INTERACTION TRACKING
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleInteraction = () => {
      setHasInteracted(true);
      document.removeEventListener('click', handleInteraction);
    };
    document.addEventListener('click', handleInteraction);
    return () => document.removeEventListener('click', handleInteraction);
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – WATCH FOR NEW NOTIFICATIONS
  ──────────────────────────────────────────── */
  useEffect(() => {
    const newUnread = notifications.filter(
      (n) => !n.read && !prevNotificationsRef.current.some((p) => p.id === n.id),
    );

    if (newUnread.length > 0) {
      setHasViewedNotifications(false);
      if (audioRef.current && (hasInteracted || audioRef.current.autoplay !== false)) {
        audioRef.current.play().catch(() => {});
      }
    }

    if (notifications.length > 20) {
      onLimitNotifications(notifications);
    }

    prevNotificationsRef.current = notifications;
  }, [notifications, hasInteracted, onLimitNotifications]);

  /* ────────────────────────────────────────────
     EFFECTS – DROPDOWN POSITION
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen && notificationButtonRef.current) {
      const rect = notificationButtonRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        right: window.innerWidth - rect.right,
      });
    }
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – MARK AS VIEWED WHEN OPENED
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) setHasViewedNotifications(true);
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – TYPEWRITER WELCOME
  ──────────────────────────────────────────── */
  useEffect(() => {
    const el = welcomeRef.current;
    if (!el || !isLoaded) return;
    const text = `Te damos la bienvenida de nuevo, ${userName}`;
    el.innerHTML = '';
    let charIndex = 0;
    text.split(' ').forEach((word, idx, arr) => {
      const span = document.createElement('span');
      span.className = styles.typewriterChar;
      span.style.opacity = '0';
      span.textContent = word;
      el.appendChild(span);
      if (idx < arr.length - 1) el.appendChild(document.createTextNode(' '));
      gsap.to(span, {
        opacity: 1,
        duration: 0.2,
        delay: charIndex * 0.1,
        ease: 'power1.in',
      });
      charIndex += word.length + 1;
    });
    return () => gsap.killTweensOf(el.querySelectorAll(`.${styles.typewriterChar}`));
  }, [userName, isLoaded]);

  /* ────────────────────────────────────────────
     EFFECTS – SUN/MOON ICON ENTRANCE
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (iconRef.current) {
      gsap.fromTo(
        iconRef.current,
        { scale: 0 },
        { scale: 1, duration: 0.6, ease: 'elastic.out(1,0.6)' },
      );
    }
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – DROPDOWN ANIMATION
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) {
      setIsNotificationsVisible(true);
      gsap.fromTo(
        notificationsRef.current,
        { opacity: 0, y: -10, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.2, ease: 'power2.out' },
      );
    } else if (isNotificationsVisible && notificationsRef.current) {
      gsap.to(notificationsRef.current, {
        opacity: 0,
        y: -10,
        scale: 0.95,
        duration: 0.2,
        ease: 'power2.in',
        onComplete: () => setIsNotificationsVisible(false),
      });
    }
  }, [isNotificationsOpen, isNotificationsVisible]);

  /* ────────────────────────────────────────────
     EFFECTS – CLOSE DROPDOWN ON OUTSIDE CLICK / ESC
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(e.target as Node) &&
        notificationButtonRef.current &&
        !notificationButtonRef.current.contains(e.target as Node)
      ) {
        setIsNotificationsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  /* ────────────────────────────────────────────
     EFFECTS – BLOCK BODY SCROLL WHEN DROPDOWN IS OPEN
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) {
      // Guardar la posición actual del scroll
      scrollPositionRef.current = window.scrollY;
      // Bloquear el scroll del body
      document.body.classList.add('no-scroll');
      document.body.style.top = `-${scrollPositionRef.current}px`;
    } else {
      // Restaurar el scroll del body
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
      window.scrollTo(0, scrollPositionRef.current);
    }

    // Limpieza al desmontar el componente
    return () => {
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
    };
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – CLOCK AND LOCATION LOGIC
  ──────────────────────────────────────────── */
  useEffect(() => {
    // Initialize time on client to avoid SSR mismatch
    setTime(new Date());
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      // Actualizar officeStatus según el horario
      if (!isOfficeHours(now)) {
        setOfficeStatus('Fuera de horario');
      }
    }, 1000);

    const browserInfo = getBrowserInfo();
    console.debug('Browser info:', browserInfo);

    const checkGeolocationPermission = async () => {
      if (typeof window === 'undefined' || !navigator.permissions) {
        return 'unknown';
      }
      try {
        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
        console.debug('Geolocation permission:', permissionStatus.state);
        return permissionStatus.state;
      } catch (error) {
        console.warn('Error checking geolocation permission:', error);
        return 'unknown';
      }
    };

    // Memoize these functions to prevent unnecessary re-renders
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        const weatherResponse = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`,
        );
        if (!weatherResponse.ok) {
          throw new Error(`HTTP error! status: ${weatherResponse.status}`);
        }
        const weatherData = await weatherResponse.json();
        if (weatherData.main && typeof weatherData.main.temp === 'number') {
          setTemperature(`${Math.round(weatherData.main.temp)}°`);
          const weatherMain = weatherData.weather[0].main.toLowerCase();
          const currentTime = new Date();
          const icon = (() => {
            switch (weatherMain) {
              case 'clouds': return '/weather/Cloudy.svg';
              case 'clear':
                return currentTime.getHours() >= 6 && currentTime.getHours() < 18
                  ? '/weather/CoolDay.svg'
                  : '/weather/CoolNight.svg';
              case 'rain': return '/weather/Rainy.svg';
              case 'snow': return '/weather/Snowy.svg';
              case 'thunderstorm': return '/weather/Storm.svg';
              case 'windy':
              case 'gust': return '/weather/Windy.svg';
              default: return null;
            }
          })();
          setWeatherIcon(icon);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
        setTemperature('N/A');
        setWeatherIcon(null);
      }
    };

    const fetchLocationAndWeather = async (lat: number, lon: number) => {
      try {
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const result = data.results[0];
          const city = result.address_components.find((comp: AddressComponent) =>
            comp.types.includes('locality'),
          )?.long_name || FALLBACK_LOCATION.name;
          setLocation(city);
          await fetchWeather(lat, lon);
        }
      } catch (error) {
        console.error('Error fetching location:', error);
        setLocation(FALLBACK_LOCATION.name);
        setTemperature('N/A');
        setWeatherIcon(null);
      }
    };

    const initializeLocation = async () => {
      const permission = await checkGeolocationPermission();
      if (permission === 'denied') {
        console.warn('Geolocation permission denied');
        setLocation(FALLBACK_LOCATION.name);
        setTemperature('N/A');
        setWeatherIcon(null);
        setOfficeStatus(isOfficeHours(new Date()) ? 'Ubicación predeterminada' : 'Fuera de horario');
        return fetchLocationAndWeather(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
      }

      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        setLocation(FALLBACK_LOCATION.name);
        setTemperature('N/A');
        setWeatherIcon(null);
        setOfficeStatus(isOfficeHours(new Date()) ? 'Ubicación predeterminada' : 'Fuera de horario');
        return fetchLocationAndWeather(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          if (isOfficeHours(new Date())) {
            const distance = calculateDistance(
              latitude,
              longitude,
              OFFICE_LOCATION.lat,
              OFFICE_LOCATION.lng,
            );
            setOfficeStatus(distance <= OFFICE_RADIUS ? 'En la oficina' : 'Fuera de la oficina');
          }
          await fetchLocationAndWeather(latitude, longitude);
        },
        (error) => {
          console.error('Geolocation error:', error);
          setLocation(FALLBACK_LOCATION.name);
          setTemperature('N/A');
          setWeatherIcon(null);
          setOfficeStatus(isOfficeHours(new Date()) ? 'Ubicación predeterminada' : 'Fuera de horario');
          fetchLocationAndWeather(FALLBACK_LOCATION.lat, FALLBACK_LOCATION.lng);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    initializeLocation();

    return () => {
      clearInterval(timer);
    };
  }, []); // Empty dependency array since we only want this to run once on mount

  /* ────────────────────────────────────────────
     EFFECTS – SCROLL POSITION TRACKING
  ──────────────────────────────────────────── */
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setScrollPosition(container.scrollTop);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isNotificationsOpen, scrollPosition]);

  /* ────────────────────────────────────────────
     EFFECTS – RESTORE SCROLL POSITION
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollPosition;
    }
  }, [isNotificationsOpen, scrollPosition]);

  const date = time
    ? time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const formattedTime = time
    ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const truncateText = (txt: string, max: number) =>
    txt.length <= max ? txt : `${txt.slice(0, max - 3)}...`;

  const formatRelativeTime = (timestamp: Timestamp) => {
    const now = time || new Date();
    const date = timestamp.toDate();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) return 'hace unos segundos';
    if (diffMinutes < 60) return `hace ${diffMinutes} minuto${diffMinutes === 1 ? '' : 's'}`;
    if (diffHours < 24) return `hace ${diffHours} hora${diffHours === 1 ? '' : 's'}`;
    if (diffDays < 30) return `hace ${diffDays} día${diffDays === 1 ? '' : 's'}`;
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  };

  const getSubtitle = () => {
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
      case 'config':
        return 'Configura tus preferencias y ajustes personales';
      default:
        return 'Esta es una lista de tus tareas actuales';
    }
  };

  /* ────────────────────────────────────────────
     NOTIFICATION BUTTON HANDLERS
  ──────────────────────────────────────────── */
  const toggleNotifications = () => {
    setIsNotificationsOpen((prev) => !prev);
    setHasInteracted(true);
  };

  const hasUnread = notifications.some((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ────────────────────────────────────────────
     DROPDOWN COMPONENT
  ──────────────────────────────────────────── */
  const NotificationDropdown = () =>
    isNotificationsVisible
      ? createPortal(
          <div
            ref={(el) => {
              notificationsRef.current = el;
              scrollContainerRef.current = el;
            }}
            className={styles.notificationDropdown}
            style={{ top: dropdownPosition.top, right: dropdownPosition.right }}
            onMouseEnter={() => setIsNotificationsOpen(true)}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!notificationButtonRef.current?.matches(':hover')) {
                  setIsNotificationsOpen(false);
                }
              }, 100);
            }}
          >
            {notifications.length === 0 ? (
              <div className={styles.notificationItem}>
                No hay notificaciones nuevas por ahora...
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => {
                const sender = users.find((u) => u.id === n.userId);
                return (
                  <div
                    key={n.id}
                    className={`${styles.notificationItem} ${n.read ? styles.read : ''}`}
                  >
                    <div className={styles.notificationContent}>
                      <div className={styles.notificationLeft}>
                        <Image
                          src={sender?.imageUrl || '/default-avatar.png'}
                          alt={sender?.firstName || 'Usuario'}
                          width={40}
                          height={40}
                          className={styles.notificationAvatar}
                        />
                      </div>
                      <div className={styles.notificationRight}>
                        <div className={styles.notificationTextWrap}>
                          <p
                            className={styles.notificationTextContent}
                            onClick={() => {
                              onNotificationClick(n);
                              setIsNotificationsOpen(false);
                            }}
                          >
                            {truncateText(n.message, 50)}
                          </p>
                          <p className={styles.notificationTime}>
                            {formatRelativeTime(n.timestamp)}
                          </p>
                        </div>
                        <div className={styles.notificationButtonWrap}>
                          <button
                            className={styles.notificationPrimaryCta}
                            onClick={() => {
                              onNotificationClick(n);
                              setIsNotificationsOpen(false);
                            }}
                          >
                            Ver Evento
                          </button>
                          <button
                            className={styles.notificationSecondaryCta}
                            onClick={() => onDeleteNotification(n.id)}
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>,
          document.body,
        )
      : null;

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.lefContainer}>
        <div className={styles.AvatarMobile}>
          <AvatarDropdown onChangeContainer={onChangeContainer} />
        </div>
        <div className={styles.frame14}>
          <div className={styles.title}>
            <div ref={welcomeRef} className={styles.welcome} />
          </div>
          <div className={styles.text}>
            <div className={styles.subtitle}>{getSubtitle()}</div>
            <AdviceInput isAdmin={isAdmin} />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
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
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease',
                  filter:
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.88)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter =
                    'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))';
                }}
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
                  : officeStatus === 'Fuera de la oficina'
                  ? '#dc3545'
                  : '#ff6f00', // Naranja para "Fuera de horario"
            }}
            className="ClockOfficeStatus"
          >
            {officeStatus}
          </div>
        </div>

        <div ref={iconRef} className={styles.sunMoonWrapper}>
          <ThemeToggler />
        </div>

        <div className={styles.notificationContainer}>
          <button
            ref={notificationButtonRef}
            className={styles.notificationButton}
            onClick={toggleNotifications}
            onMouseEnter={() => {
              setIsNotificationsOpen(true);
              setHasViewedNotifications(true);
              setHasInteracted(true);
            }}
            onMouseLeave={() => {
              setTimeout(() => {
                if (!notificationButtonRef.current?.matches(':hover')) {
                  setIsNotificationsOpen(false);
                }
              }, 100);
            }}
            aria-label="Abrir notificaciones"
            aria-expanded={isNotificationsOpen}
            aria-controls="notification-dropdown"
          >
            {hasUnread && !hasViewedNotifications ? (
              <div className={styles.notification}>
                <div className={styles.bellContainer}>
                  <div className={styles.bell}></div>
                </div>
                {unreadCount > 0 && (
                  <span className={styles.notificationCount} aria-live="polite">{unreadCount}</span>
                )}
              </div>
            ) : (
              <Image
                src="/EmptyNotification.svg"
                alt="Notificaciones"
                width={24}
                height={24}
                style={{ width: 'auto', height: 'auto' }}
              />
            )}
          </button>
          <NotificationDropdown />
        </div>

        <div className={styles.AvatarDesktop}>
          <AvatarDropdown onChangeContainer={onChangeContainer} />
        </div>
      </div>
    </div>
  );
};

export default Header;
