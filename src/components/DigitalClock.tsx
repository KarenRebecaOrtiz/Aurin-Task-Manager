'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import styles from './DigitalClock.module.scss';
import { gsap } from 'gsap';

interface WeatherData {
  name: string;
  main?: { temp: number };
}

export default function ClientClock() {
  const [time, setTime] = useState(new Date());
  const [location, setLocation] = useState("Loading...");
  const [temperature, setTemperature] = useState("Loading...");
  const clockRef = useRef<HTMLDivElement>(null);

  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    try {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=87e8cab695e117736d9e3f37a0b533c9`
      );
      if (!weatherResponse.ok) {
        const errorText = await weatherResponse.text();
        console.error("Weather API error:", errorText);
        throw new Error(`HTTP error! status: ${weatherResponse.status}, message: ${errorText}`);
      }
      const weatherData: WeatherData = await weatherResponse.json();
      if (weatherData.main && typeof weatherData.main.temp === 'number') {
        setLocation(weatherData.name || "Unknown Location");
        setTemperature(`${Math.round(weatherData.main.temp)}°`);
      } else {
        console.warn("Weather data structure invalid:", weatherData);
        setLocation("Data unavailable");
        setTemperature("N/A");
      }
    } catch (error) {
      console.error("Error fetching weather:", error);
      setLocation("Error");
      setTemperature("N/A");
    }
  }, [setLocation, setTemperature]);

  const getLocation = useCallback(() => {
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
  }, [fetchWeather, setLocation]);

  const handleScrollAnimation = useCallback(() => {
    if (!clockRef.current) return;

    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;

    if (scrollPosition > windowHeight / 2) {
      gsap.to(clockRef.current, {
        duration: 0.5,
        y: 100,
        opacity: 0,
        ease: 'power2.out',
        onComplete: () => {
          clockRef.current?.classList.remove('visible');
          clockRef.current?.classList.add('hidden');
        },
      });
    } else {
      gsap.to(clockRef.current, {
        duration: 0.5,
        y: 0,
        opacity: 1,
        ease: 'power2.out',
        onStart: () => {
          clockRef.current?.classList.remove('hidden');
          clockRef.current?.classList.add('visible');
        },
      });
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    getLocation();
    handleScrollAnimation();

    return () => {
      clearInterval(timer);
      window.removeEventListener('scroll', handleScrollAnimation);
    };
  }, [getLocation, handleScrollAnimation]);

  useEffect(() => {
    window.addEventListener('scroll', handleScrollAnimation);
    return () => window.removeEventListener('scroll', handleScrollAnimation);
  }, [handleScrollAnimation]);

  const date = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const formattedTime = time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  return (
    <div ref={clockRef} className={`${styles.clockContainer} ${styles.visible}`}>
      <div className={styles.clockText}>{date}</div>
      <div className={styles.clockText}>{location}</div>
      <div className={styles.clockText}>{temperature}</div>
      <div className={styles.clockText}>{formattedTime}</div>
    </div>
  );
}