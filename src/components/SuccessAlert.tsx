"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
  const hasRenderedToast = useRef(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  const debounce = useCallback((func: () => void, delay: number) => {
    let timer: NodeJS.Timeout;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(func, delay);
    };
  }, []);

  const playAudio = useCallback(async () => {
    if (!audioRef.current) {
      console.error("[SuccessAlert] Audio ref is null, cannot play");
      setAudioError("Audio initialization failed");
      return;
    }

    try {
      console.log("[SuccessAlert] Attempting to play Success.mp3");
      isPlaying.current = true;
      await audioRef.current.play();
      console.log("[SuccessAlert] Audio playback started successfully");
      setAudioError(null);
    } catch (error: any) {
      console.error("[SuccessAlert] Audio playback error:", error.message);
      isPlaying.current = false;
      setAudioError("Browser blocked audio autoplay. Click a button to try playing.");
      const tryPlayOnInteraction = () => {
        if (audioRef.current && !isPlaying.current) {
          audioRef.current.play()
            .then(() => {
              console.log("[SuccessAlert] Audio played successfully after user interaction");
              isPlaying.current = true;
              setAudioError(null);
            })
            .catch((err) => {
              console.error("[SuccessAlert] Fallback audio play failed:", err.message);
              setAudioError("Audio playback failed: " + err.message);
            });
        }
      };
      const buttons = toastRef.current?.querySelectorAll("button");
      buttons?.forEach((btn) => btn.addEventListener("click", tryPlayOnInteraction, { once: true }));
    }
  }, []);

  useEffect(() => {
    if (hasRenderedToast.current) {
      console.log("[SuccessAlert] Toast already rendered, skipping duplicate");
      return;
    }

    console.log("[SuccessAlert] Component mounting with message:", message);
    setIsMounted(true);
    hasRenderedToast.current = true;

    if (!audioRef.current) {
      console.log("[SuccessAlert] Creating new Audio instance for Success.mp3");
      audioRef.current = new Audio("/Success.mp3");
      audioRef.current.preload = "auto";
      audioRef.current.onerror = () => {
        console.error("[SuccessAlert] Audio loading error");
        setAudioError("Failed to load audio file");
      };
    }

    const id = sonnerToast.custom(
      () => (
        <div className={styles.notificationsContainer}>
          <div className={`${styles.toast} ${styles.success}`} ref={toastRef}>
            <div className={styles.flex}>
              <div className={styles.flexShrink0}>
                <Image
                  src="/check.svg"
                  alt="Success"
                  width={20}
                  height={20}
                  className={styles.successSvg}
                  onError={() => console.error("[SuccessAlert] Failed to load check.svg")}
                />
              </div>
              <div className={styles.successPromptWrap}>
                <p className={styles.successPromptHeading}>Éxito</p>
                <div className={styles.successPromptPrompt}>
                  <p>{message}</p>
                  {audioError && <p className={styles.audioError}>{audioError}</p>}
                </div>
                <div className={styles.successButtonContainer}>
                  {onAction && actionLabel && (
                    <button
                      type="button"
                      className={styles.successButtonMain}
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
                    className={styles.successButtonSecondary}
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

    return () => {
      console.log("[SuccessAlert] Component unmounting, cleaning up, toastId:", id);
      setIsMounted(false);
      sonnerToast.dismiss(id);
      if (audioRef.current && isPlaying.current && !audioRef.current.paused) {
        console.log("[SuccessAlert] Pausing audio on cleanup");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isPlaying.current = false;
      }
      hasRenderedToast.current = false;
    };
  }, [message, onClose, onAction, actionLabel]);

  useEffect(() => {
    if (toastRef.current && isMounted) {
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
          onComplete: () => {
            console.log("[SuccessAlert] GSAP animation completed");
            playAudio(); // Trigger audio after animation
          },
        }
      );

      const computedStyles = window.getComputedStyle(toastRef.current);
      console.log("[SuccessAlert] Toast computed styles:", {
        display: computedStyles.display,
        opacity: computedStyles.opacity,
        visibility: computedStyles.visibility,
        position: computedStyles.position,
        top: computedStyles.top,
        zIndex: computedStyles.zIndex,
        width: computedStyles.width,
        height: computedStyles.height,
      });
    }
  }, [isMounted, playAudio]);

  return null;
};

export default SuccessAlert;