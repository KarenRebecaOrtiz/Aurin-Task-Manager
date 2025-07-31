'use client';

import { useUser } from '@clerk/nextjs';
import AdviceInput from '@/components/ui/AdviceInput';
import ToDoDynamic from '@/components/ToDoDynamic';
import AvailabilityToggle from '@/components/ui/AvailabilityToggle';
import styles from './Header.module.scss';
import { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';
import AvatarDropdown from '../AvatarDropdown';
import NotificationDropdown from './NotificationDropdown';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import SimpleTooltip from './SimpleTooltip';

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
  isArchiveTableOpen?: boolean;
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onLimitNotifications: (notifications: Notification[]) => void;
  onChangeContainer: (container: 'tareas' | 'cuentas' | 'miembros' | 'config') => void;
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  isArchiveTableOpen,
  users,
  notifications,
  onNotificationClick,
  onLimitNotifications,
  onChangeContainer,
}) => {
  const { user, isLoaded } = useUser();
  const { isAdmin } = useAuth();
  const { isDarkMode } = useTheme();
  const userName = isLoaded && user ? user.firstName || 'Usuario' : 'Usuario';

  /* ────────────────────────────────────────────
     REFS
  ──────────────────────────────────────────── */
  const welcomeRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iconRef = useRef<HTMLDivElement>(null);
  const notificationButtonRef = useRef<HTMLButtonElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const prevNotificationsRef = useRef<Notification[]>([]);

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
    // Sincronizar isNotificationsVisible con isNotificationsOpen
    setIsNotificationsVisible(isNotificationsOpen);
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – TYPEWRITER WELCOME
  ──────────────────────────────────────────── */
  useEffect(() => {
    const el = welcomeRef.current;
    if (!el || !isLoaded) return;
    const text = `Te damos la bienvenida de nuevo, ${userName}`;
    el.innerHTML = '';
    const textWrapper = document.createElement('span');
    textWrapper.className = styles.typewriterWrapper;
    el.appendChild(textWrapper);
    text.split(' ').forEach((word, idx, arr) => {
      const span = document.createElement('span');
      span.className = styles.typewriterChar;
      span.style.opacity = '0';
      span.textContent = word;
      textWrapper.appendChild(span);
      if (idx < arr.length - 1) textWrapper.appendChild(document.createTextNode(' '));
      gsap.to(span, {
        opacity: 1,
        duration: 0.2,
        delay: idx * 0.1,
        ease: 'power1.in',
      });
    });

    if (isAdmin) {
      const buttonWrapper = document.createElement('span');
      buttonWrapper.className = styles.adminButtonWrapper;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = styles.adminButton;
      button.innerHTML = `
        <span class="${styles.fold}"></span>
        <div class="${styles.pointsWrapper}">
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
          <i class="${styles.point}"></i>
        </div>
        <span class="${styles.inner}">
          <img
            src="/verified.svg"
            alt="Verified Icon"
            class="${styles.icon}"
          />
        </span>
      `;
      buttonWrapper.appendChild(button);
      el.appendChild(buttonWrapper);
    }

    return () => gsap.killTweensOf(el.querySelectorAll(`.${styles.typewriterChar}`));
  }, [userName, isLoaded, isAdmin]);

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
     EFFECTS – CLOSE DROPDOWN ON OUTSIDE CLICK / ESC
  ──────────────────────────────────────────── */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsNotificationsOpen(false);
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      
      // Si el dropdown no está abierto, no hacer nada
      if (!isNotificationsOpen) return;
      
      // Si el click fue en el botón de notificaciones, no cerrar (ya se maneja en toggleNotifications)
      if (notificationButtonRef.current?.contains(target)) return;
      
      // Si el click fue dentro del dropdown, no cerrar
      if (target.closest('[data-notification-dropdown]')) return;
      
      // Si llegamos aquí, el click fue fuera del dropdown y del botón, entonces cerrar
      setIsNotificationsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – BLOCK BODY SCROLL WHEN DROPDOWN IS OPEN
  ──────────────────────────────────────────── */
  useEffect(() => {
    if (isNotificationsOpen) {
      const scrollPosition = window.scrollY;
      document.body.classList.add('no-scroll');
      document.body.style.top = `-${scrollPosition}px`;
    } else {
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
      window.scrollTo(0, parseInt(document.body.style.top || '0'));
    }

    return () => {
      document.body.classList.remove('no-scroll');
      document.body.style.top = '';
    };
  }, [isNotificationsOpen]);

  /* ────────────────────────────────────────────
     EFFECTS – CLOCK AND LOCATION LOGIC (HEARTBEAT)
  ──────────────────────────────────────────── */
  useEffect(() => {
    setTime(new Date());
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      if (!isOfficeHours(now)) {
        setOfficeStatus('Fuera de horario');
      }
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
          if (isOfficeHours(new Date())) {
            const distance = calculateDistance(
              latitude,
              longitude,
              OFFICE_LOCATION.lat,
              OFFICE_LOCATION.lng,
            );
            setOfficeStatus(distance <= OFFICE_RADIUS ? 'En la oficina' : 'Fuera de la oficina');
          } else {
            setOfficeStatus('Fuera de horario');
          }
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
  }, []);

  const date = time
    ? time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    : '';
  const formattedTime = time
    ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
    : '';

  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const getSubtitle = () => {
    // Si el archivo está abierto, mostrar texto específico para archivo
    if (isArchiveTableOpen) {
      return 'Aquí puedes ver y gestionar todas las tareas archivadas';
    }
    
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
  const toggleNotifications = useCallback(() => {
    const newIsOpen = !isNotificationsOpen;
    setIsNotificationsOpen(newIsOpen);
    setHasInteracted(true);
    
    // Si se está abriendo el dropdown, marcar como vistas
    if (newIsOpen) {
      setHasViewedNotifications(true);
    }
  }, [isNotificationsOpen]);

  const handleNotificationClick = useCallback((notification: Notification) => {
    onNotificationClick(notification);
  }, [onNotificationClick]);

  const handleCloseNotifications = useCallback(() => {
    setIsNotificationsOpen(false);
  }, []);

  const hasUnread = notifications.some((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  /* ────────────────────────────────────────────
     RENDER
  ──────────────────────────────────────────── */
  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <div className={styles.logoAndWelcomeContainer}>
        <div 
          className={styles.logoContainer}
          onClick={() => onChangeContainer('tareas')}
        >
          <Image
            src={isDarkMode ? '/logoDark.svg' : '/logoLight.svg'}
            alt="Logo"
            width={180}
            height={68}
            style={{
              transition: 'all 0.3s ease',
              filter: isDarkMode 
                ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
                : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = isDarkMode 
                ? 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.5)) brightness(1.1)' 
                : 'drop-shadow(0 6px 12px rgba(255, 255, 255, 0.5)) brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = isDarkMode 
                ? 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))' 
                : 'drop-shadow(0 4px 8px rgba(255, 255, 255, 0.3))';
            }}
          />
        </div>
        <div className={styles.lefContainer}style={{justifyContent: 'start'}}>
          <div className={styles.AvatarMobile}>
            <AvatarDropdown onChangeContainer={onChangeContainer} />
          </div>
          <div className={styles.frame14}>
            <div className={styles.title}>
              <div ref={welcomeRef} className={styles.welcome} />
            </div>
            <div className={styles.text}>
              <div className={styles.subtitle}>{getSubtitle()}</div>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.headerContainer}>
        <div className={styles.superiorHeader}>
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
                    : '#ff6f00',
              }}
              className={styles.ClockOfficeStatuHidden}
            >
              {officeStatus}
            </div>
          </div>

          <div className={styles.todoContainer}>
            <ToDoDynamic />
          </div>

          <div className={styles.availabilityContainer}>
            <AvailabilityToggle />
          </div>

          <div className={styles.notificationContainer}>
            <SimpleTooltip text="Notificaciones">
              <button
                ref={notificationButtonRef}
                className={styles.notificationButton}
                onClick={toggleNotifications}
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
            </SimpleTooltip>
            <NotificationDropdown
              isVisible={isNotificationsVisible}
              isOpen={isNotificationsOpen}
              users={users}
              dropdownPosition={dropdownPosition}
              onNotificationClick={handleNotificationClick}
              onClose={handleCloseNotifications}
            />
          </div>

          <div className={styles.AvatarDesktop}>
            <AvatarDropdown onChangeContainer={onChangeContainer} />
          </div>
        </div>
        <div className={styles.adviceContainer}>
          <AdviceInput isAdmin={isAdmin} />
        </div>
      </div>
    </div>
  );
};

export default Header;