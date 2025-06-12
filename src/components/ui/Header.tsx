'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import ThemeToggler from './ThemeToggler';
import styles from './Header.module.scss';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { gsap } from 'gsap'; // Importar GSAP
import Image from 'next/image';
import { Timestamp } from 'firebase/firestore';

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
  selectedContainer: 'tareas' | 'proyectos' | 'cuentas' | 'miembros';
  onChatSidebarOpen: (task: {
    id: string;
    clientId: string;
    project: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    LeadedBy: string[];
    AssignedTo: string[];
    createdAt: string;
  }) => void;
  tasks: {
    id: string;
    clientId: string;
    project: string;
    name: string;
    description: string;
    status: string;
    priority: string;
    startDate: string | null;
    endDate: string | null;
    LeadedBy: string[];
    AssignedTo: string[];
    createdAt: string;
  }[];
  users: { id: string; fullName: string; firstName?: string; imageUrl: string }[];
  notifications: Notification[];
  onNotificationClick: (notification: Notification) => void;
  onClearNotifications: () => void; // Nueva prop para eliminar todas las notificaciones
  onLimitNotifications: (notifications: Notification[]) => void; // Nueva prop para limitar a 20
}

const Header: React.FC<HeaderProps> = ({
  selectedContainer,
  onChatSidebarOpen,
  tasks,
  users,
  notifications,
  onNotificationClick,
  onClearNotifications,
  onLimitNotifications,
}) => {
  const { user } = useUser();
  const userName = user?.firstName || 'Usuario';

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

  /* ────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────── */
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isNotificationsVisible, setIsNotificationsVisible] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [hasViewedNotifications, setHasViewedNotifications] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const [isCleared, setIsCleared] = useState(false);
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState("Loading...");
  const [temperature, setTemperature] = useState("Loading...");
  const [weatherIcon, setWeatherIcon] = useState<string | null>(null); // Estado para el icono

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
     (PLAYS SOUND ON ARRIVAL & LIMITS TO 20)
  ──────────────────────────────────────────── */
  useEffect(() => {
    const newUnread = notifications.filter(
      (n) =>
        !n.read &&
        !prevNotificationsRef.current.some((p) => p.id === n.id),
    );

    if (newUnread.length > 0) {
      setHasViewedNotifications(false);
      setIsCleared(false);
      if (audioRef.current && (hasInteracted || audioRef.current.autoplay !== false)) {
        audioRef.current.play().catch(() => {});
      }
    }

    // Verificar si hay más de 20 notificaciones y eliminar las más antiguas
    if (notifications.length > 20) {
      onLimitNotifications(notifications);
    }

    prevNotificationsRef.current = notifications;
  }, [notifications, onLimitNotifications]);

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
    if (!el) return;
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
  }, [userName]);

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
     EFFECTS – CLOCK LOGIC
  ──────────────────────────────────────────── */
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    getLocation();

    return () => clearInterval(timer);
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchWeather(latitude, longitude);
        },
        (error) => {
          console.error("Error getting location:", error);
          setLocation("Unknown");
        }
      );
    } else {
      setLocation("Geolocation not supported");
    }
  };

  const fetchWeather = async (lat: number, lon: number) => {
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.NEXT_PUBLIC_OPENWEATHER_API_KEY}`
      );
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error("Weather API error:", errorText);
        throw new Error(`HTTP error! status: ${weatherResponse.status}, message: ${errorText}`);
      }
      const weatherData = await weatherResponse.json();
      if (weatherData.main && typeof weatherData.main.temp === 'number') {
        setLocation(weatherData.name || "Unknown Location");
        setTemperature(`${Math.round(weatherData.main.temp)}°`);
        // Determinar icono basado en el clima
        const weatherMain = weatherData.weather[0].main.toLowerCase();
        switch (weatherMain) {
          case 'clouds':
            setWeatherIcon('/weather/Cloudy.svg');
            break;
          case 'clear':
            setWeatherIcon(new Date().getHours() >= 6 && new Date().getHours() < 18 ? '/weather/CoolDay.svg' : '/weather/CoolNight.svg');
            break;
          case 'rain':
            setWeatherIcon('/weather/Rainy.svg');
            break;
          case 'snow':
            setWeatherIcon('/weather/Snowy.svg');
            break;
          case 'thunderstorm':
            setWeatherIcon('/weather/Storm.svg');
            break;
          case 'windy':
          case 'gust':
            setWeatherIcon('/weather/Windy.svg');
            break;
          default:
            setWeatherIcon(null); // Sin icono si no coincide
        }
      } else {
        console.warn("Weather data structure invalid:", weatherData);
        setLocation("Data unavailable");
        setTemperature("N/A");
        setWeatherIcon(null);
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setLocation("Error");
      setTemperature("N/A");
      setWeatherIcon(null);
    }
  };

  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  /* ────────────────────────────────────────────
     HELPERS
  ──────────────────────────────────────────── */
  const truncateText = (txt: string, max: number) =>
    txt.length <= max ? txt : `${txt.slice(0, max - 3)}...`;

  const getSubtitle = () => {
    switch (selectedContainer) {
      case 'tareas':
        return 'Esta es una lista de tus tareas actuales';
      case 'proyectos':
        return 'Aquí puedes gestionar los proyectos asignados a cada cuenta';
      case 'cuentas':
        return 'Aquí puedes ver y gestionar todas las cuentas asociadas a tu organización';
      case 'miembros':
        return 'Aquí puedes consultar y gestionar todos los miembros de tu organización';
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

  const handleClearNotifications = () => {
    setIsCleared(true);
    onClearNotifications(); // Elimina todas las notificaciones en Firestore
    setIsNotificationsOpen(true);
  };

  const hasUnread = notifications.some((n) => !n.read);
  const iconSrc =
    hasUnread && !hasViewedNotifications ? '/NewNotification.svg' : '/EmptyNotification.svg';

  /* ────────────────────────────────────────────
     DROPDOWN COMPONENT
  ──────────────────────────────────────────── */
  const NotificationDropdown = () =>
    isNotificationsVisible
      ? createPortal(
          <div
            ref={(el) => {
              notificationsRef.current = el;
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
            {/* Botón Limpiar Notificaciones */}
            {notifications.length > 0 && !isCleared && (
              <div className={styles.clearNotificationsContainer}>
                <button
                  className={styles.clearNotificationsButton}
                  onClick={handleClearNotifications}
                  aria-label="Limpiar todas las notificaciones"
                >
                  Limpiar Notificaciones
                </button>
              </div>
            )}

            {/* Contenido del dropdown */}
            {isCleared || notifications.length === 0 ? (
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
                    onClick={() => {
                      onNotificationClick(n);
                      setIsNotificationsOpen(false);
                    }}
                  >
                    <Image
                      src={sender?.imageUrl || '/default-avatar.png'}
                      alt={sender?.firstName || 'Usuario'}
                      width={24}
                      height={24}
                      className={styles.notificationAvatar}
                    />
                    <span>{truncateText(n.message, 50)}</span>
                    <span className={styles.notificationTimestamp}>
                      {n.timestamp.toDate().toLocaleString('es-ES', {
                        day: '2-digit',
                        month: '2-digit',
                        year: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
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
    <div ref={wrapperRef} data-layer="Wrapper" className={styles.wrapper}>
      {/* LEFT: Avatar + Welcome */}
      <div className={styles.lefContainer}>
        <UserButton
          appearance={{
            elements: { userButtonAvatarBox: { width: '60px', height: '60px' } },
          }}
        />
        <div data-layer="Frame 14" className={styles.frame14}>
          <div data-layer="Title" className={styles.title}>
            <div ref={welcomeRef} className={styles.welcome} />
          </div>
          <div data-layer="Text" className={styles.text}>
            <div className={styles.subtitle}>{getSubtitle()}</div>
          </div>
        </div>
      </div>

      {/* RIGHT: Clock and Buttons in vertical stack */}
      <div data-layer="Frame 2147225819" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px'}}>

        <div style={{ display: 'flex', flexDirection: 'row' , gap: '10px'}}>
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
                  if (!notificationsRef.current?.matches(':hover')) {
                    setIsNotificationsOpen(false);
                  }
                }, 100);
              }}
              aria-label="Abrir notificaciones"
              aria-expanded={isNotificationsOpen}
              aria-controls="notification-dropdown"
            >
              <Image src={iconSrc} alt="Notifications" width={24} height={24} />
            </button>
            <NotificationDropdown />
          </div>
          <div ref={iconRef} className={styles.sunMoonWrapper}>
            <ThemeToggler />
          </div>
        </div>
        <div className={styles.Clock}>
          <div style={{ fontSize: '10px', fontFamily: 'Inconsolata, monospace' }} className="ClockDate">
            {date}
          </div>
          <div style={{ fontSize: '10px',fontWeight: '600', fontFamily: 'Inconsolata, monospace' }} className="ClockTime">
            {formattedTime}
          </div>
          <div style={{alignItems:'start', display: 'flex', fontSize: '10px', fontFamily: 'Inconsolata, monospace' }} className="ClockTemperature">
            {location} {temperature}
            {weatherIcon && (
              <Image
                src={weatherIcon}
                draggable= 'false'
                alt="Weather Icon"
                width={15}
                height={15}
                style={{
                  marginLeft: '5px',
                  transition: 'transform 0.3s ease, filter 0.3s ease', 
                  filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))', // Sombra perrona
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.2)';
                  e.currentTarget.style.filter = 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.88)) drop-shadow(0 8px 25px rgba(0, 0, 0, 0.93))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.filter = 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3)) drop-shadow(0 6px 20px rgba(0, 0, 0, 0.2))'; // Regresa a sombra normal
                }}
              />
            )}
          </div>
        
        </div>
      </div>
    </div>
  );
};

export default Header;