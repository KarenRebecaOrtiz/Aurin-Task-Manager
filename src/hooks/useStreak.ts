'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastAccessDate: string | null;
  totalAccessDays: number;
}

export const useStreak = (targetUserId?: string) => {
  const { user, isLoaded } = useUser();
  const [streakData, setStreakData] = useState<StreakData>({
    currentStreak: 0,
    longestStreak: 0,
    lastAccessDate: null,
    totalAccessDays: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  // Usar el userId proporcionado o el del usuario actual
  const userId = targetUserId || user?.id;

  // Función para verificar si dos fechas son consecutivas
  const areConsecutiveDays = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2.getTime() - d1.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
  };

  // Función para verificar si es el mismo día
  const isSameDay = (date1: string, date2: string): boolean => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.toDateString() === d2.toDateString();
  };

  // Función para obtener la fecha actual en formato YYYY-MM-DD
  const getCurrentDate = (): string => {
    return new Date().toISOString().split('T')[0];
  };

  // Función para actualizar el streak
  const updateStreak = useCallback(async () => {
    if (!userId || isUpdating) return;

    setIsUpdating(true);
    try {
      const userDocRef = doc(db, 'users', userId);
      const currentDate = getCurrentDate();
      
      // Obtener datos actuales
      const docSnap = await getDoc(userDocRef);
      const currentData = docSnap.exists() ? docSnap.data() : {};
      
      const newStreakData = {
        currentStreak: currentData.currentStreak || 0,
        longestStreak: currentData.longestStreak || 0,
        lastAccessDate: currentData.lastAccessDate || null,
        totalAccessDays: currentData.totalAccessDays || 0,
      };

      // Si es la primera vez que accede hoy
      if (!newStreakData.lastAccessDate || !isSameDay(newStreakData.lastAccessDate, currentDate)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];

        console.log('[useStreak] Debug:', {
          userId,
          currentDate,
          lastAccessDate: newStreakData.lastAccessDate,
          yesterdayStr,
          areConsecutive: newStreakData.lastAccessDate ? areConsecutiveDays(newStreakData.lastAccessDate, currentDate) : false,
          isSameAsYesterday: newStreakData.lastAccessDate ? isSameDay(newStreakData.lastAccessDate, yesterdayStr) : false
        });

        // Verificar si accedió ayer (día consecutivo)
        if (newStreakData.lastAccessDate && areConsecutiveDays(newStreakData.lastAccessDate, currentDate)) {
          // Incrementar streak (día consecutivo)
          newStreakData.currentStreak += 1;
          console.log('[useStreak] Streak incrementado:', newStreakData.currentStreak);
        } else if (newStreakData.lastAccessDate && !isSameDay(newStreakData.lastAccessDate, yesterdayStr)) {
          // Si no accedió ayer, resetear streak a 0 (rompió la racha)
          newStreakData.currentStreak = 0;
          console.log('[useStreak] Streak reseteado a 0 (rompió la racha)');
        } else if (!newStreakData.lastAccessDate) {
          // Primera vez - empezar con streak = 1
          newStreakData.currentStreak = 1;
          console.log('[useStreak] Primera vez - streak iniciado en 1');
        }

        // Actualizar longest streak si es necesario
        if (newStreakData.currentStreak > newStreakData.longestStreak) {
          newStreakData.longestStreak = newStreakData.currentStreak;
        }

        // Incrementar total de días de acceso
        newStreakData.totalAccessDays += 1;
        newStreakData.lastAccessDate = currentDate;

        // Actualizar en Firestore
        await updateDoc(userDocRef, {
          currentStreak: newStreakData.currentStreak,
          longestStreak: newStreakData.longestStreak,
          lastAccessDate: newStreakData.lastAccessDate,
          totalAccessDays: newStreakData.totalAccessDays,
        });

        setStreakData(newStreakData);
      }
    } catch (error) {
      console.error('[useStreak] Error updating streak:', error);
    } finally {
      setIsUpdating(false);
    }
  }, [userId, isUpdating]);

  // Escuchar cambios en Firestore
  useEffect(() => {
    if (!userId || !isLoaded) {
      setIsLoading(false);
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setStreakData({
            currentStreak: data.currentStreak || 0,
            longestStreak: data.longestStreak || 0,
            lastAccessDate: data.lastAccessDate || null,
            totalAccessDays: data.totalAccessDays || 0,
          });
        }
        setIsLoading(false);
      },
      (error) => {
        console.error('[useStreak] Error listening to streak data:', error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId, isLoaded]);

  return {
    streakData,
    updateStreak,
    isLoading,
    isUpdating,
  };
}; 