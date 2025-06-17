"use client";

import { useLayoutEffect, useRef, useState, useCallback, useEffect } from "react";
import { toast as sonnerToast } from "sonner";
import { gsap } from "gsap";
import Image from "next/image";
import styles from "./SuccessAlert.module.scss";

interface SuccessAlertProps {
  message: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const SuccessAlert: React.FC<SuccessAlertProps> = ({ message, onClose, onAction, actionLabel }) => {
  const toastRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [toastId, setToastId] = useState<string | number | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const isPlaying = useRef(false);
  const hasRenderedToast = useRef(false); // Control para un solo toast

  // Debounce cleanup
  const debounce = useCallback((func: () => void, delay: number) => {
    let timer: NodeJS.Timeout;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(func, delay);
    };
  }, []);

  useLayoutEffect(() => {
    if (hasRenderedToast.current) {
      console.log("[SuccessAlert] Toast already rendered, skipping duplicate");
      return;
    }

    console.log("[SuccessAlert] Component mounting with message:", message);
    setIsMounted(true);
    hasRenderedToast.current = true;

    // Initialize audio
    if (!audioRef.current) {
      console.log("[SuccessAlert] Creating new Audio instance for Success.mp3");
      audioRef.current = new Audio("/Success.mp3");
    }

    // Play audio
    const playAudio = async () => {
      if (!audioRef.current) {
        console.error("[SuccessAlert] Audio ref is null, cannot play");
        return;
      }
      try {
        console.log("[SuccessAlert] Attempting to play Success.mp3");
        isPlaying.current = true;
        await audioRef.current.play();
        console.log("[SuccessAlert] Audio playback started successfully");
      } catch (error) {
        console.error("[SuccessAlert] Failed to play audio:", error);
        isPlaying.current = false;
      }
    };

    // Show toast
    console.log("[SuccessAlert] Creating sonner toast");
    const id = sonnerToast.custom(
      () => (
        <div className={`${styles.toast} ${styles.success}`} ref={toastRef}>
          <div className={styles.icon}>
            <Image
              src="/check.svg"
              alt="Success"
              width={16}
              height={16}
              onError={() => console.error("[SuccessAlert] Failed to load check.svg")}
            />
          </div>
          <div className={styles.content}>
            <div className={styles.title}>Éxito</div>
            <div className={styles.description}>{message}</div>
            <div className={styles.buttons}>
              {onAction && actionLabel && (
                <button
                  type="button"
                  className={styles.buttonMain}
                  onClick={() => {
                    console.log("[SuccessAlert] Action button clicked, dismissing toast:", id);
                    onAction();
                    sonnerToast.dismiss(id);
                  }}
                >
                  {actionLabel}
                </button>
              )}
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => {
                  console.log("[SuccessAlert] Close button clicked, dismissing toast:", id);
                  sonnerToast.dismiss(id);
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: 5000,
        onDismiss: () => {
          console.log("[SuccessAlert] Toast dismissed, triggering onClose, toastId:", id);
          onClose();
          if (audioRef.current && isPlaying.current) {
            console.log("[SuccessAlert] Pausing audio on dismiss");
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            isPlaying.current = false;
          }
        },
        onAutoClose: () => {
          console.log("[SuccessAlert] Toast auto-closed after 5s, toastId:", id);
        },
        style: { zIndex: 10002, opacity: 1 },
      }
    );

    setToastId(id);
    console.log("[SuccessAlert] Toast created with ID:", id);

    // GSAP animation
    if (toastRef.current) {
      console.log("[SuccessAlert] Applying GSAP animation to toastRef");
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, y: -20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          ease: "power2.out",
          onStart: () => console.log("[SuccessAlert] GSAP animation started"),
          onComplete: () => console.log("[SuccessAlert] GSAP animation completed"),
        }
      );
    } else {
      console.warn("[SuccessAlert] toastRef is null, retrying after delay");
      const timer = setTimeout(() => {
        if (toastRef.current) {
          console.log("[SuccessAlert] Retry GSAP animation on toastRef");
          gsap.fromTo(
            toastRef.current,
            { opacity: 0, y: -20 },
            {
              opacity: 1,
              y: 0,
              duration: 0.3,
              ease: "power2.out",
              onStart: () => console.log("[SuccessAlert] Retry GSAP animation started"),
              onComplete: () => console.log("[SuccessAlert] Retry GSAP animation completed"),
            }
          );
        }
      }, 100);
      return () => clearTimeout(timer);
    }

    // Play audio
    playAudio();

    // Debounced cleanup
    const cleanup = debounce(() => {
      console.log("[SuccessAlert] Component unmounting, cleaning up, toastId:", id);
      setIsMounted(false);
      sonnerToast.dismiss(id);
      if (audioRef.current && isPlaying.current && !audioRef.current.paused) {
        console.log("[SuccessAlert] Pausing audio on cleanup");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isPlaying.current = false;
      }
      hasRenderedToast.current = false; // Reset for next mount
    }, 200);

    return cleanup;
  }, [message, onClose, onAction, actionLabel, debounce]);

  // Debug toast visibility
  useEffect(() => {
    if (toastRef.current && isMounted) {
      const styles = window.getComputedStyle(toastRef.current);
      console.log("[SuccessAlert] Toast computed styles:", {
        display: styles.display,
        opacity: styles.opacity,
        visibility: styles.visibility,
        position: styles.position,
        top: styles.top,
        zIndex: styles.zIndex,
        width: styles.width,
        height: styles.height,
      });
    } else {
      console.log("[SuccessAlert] Toast ref or mount status:", { toastRef: !!toastRef.current, isMounted });
    }
  }, [isMounted]);

  return null;
};

export default SuccessAlert;