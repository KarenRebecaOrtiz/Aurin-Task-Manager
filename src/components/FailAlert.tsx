"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { toast as sonnerToast } from "sonner";
import { gsap } from "gsap";
import styles from "./FailAlert.module.scss";

interface FailAlertProps {
  message: string;
  error: string;
  onClose: () => void;
  onAction?: () => void;
  actionLabel?: string;
}

const FailAlert: React.FC<FailAlertProps> = ({ message, error, onClose, onAction, actionLabel }) => {
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
      console.error("[FailAlert] Audio ref is null, cannot play");
      setAudioError("Audio initialization failed");
      return;
    }

    try {
      console.log("[FailAlert] Attempting to play Error.mp3");
      isPlaying.current = true;
      await audioRef.current.play();
      console.log("[FailAlert] Audio playback started successfully");
      setAudioError(null);
    } catch (error: any) {
      console.error("[FailAlert] Audio playback error:", error.message);
      isPlaying.current = false;
      setAudioError("Browser blocked audio autoplay. Click a button to try playing.");
      const tryPlayOnInteraction = () => {
        if (audioRef.current && !isPlaying.current) {
          audioRef.current.play()
            .then(() => {
              console.log("[FailAlert] Audio played successfully after user interaction");
              isPlaying.current = true;
              setAudioError(null);
            })
            .catch((err) => {
              console.error("[FailAlert] Fallback audio play failed:", err.message);
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
      console.log("[FailAlert] Toast already rendered, skipping duplicate");
      return;
    }

    console.log("[FailAlert] Component mounting with message:", message, "error:", error);
    setIsMounted(true);
    hasRenderedToast.current = true;

    if (!audioRef.current) {
      console.log("[FailAlert] Creating new Audio instance for Error.mp3");
      audioRef.current = new Audio("/Error.mp3");
      audioRef.current.preload = "auto";
      audioRef.current.onerror = () => {
        console.error("[FailAlert] Audio loading error");
        setAudioError("Failed to load audio file");
      };
    }

    const id = sonnerToast.custom(
      () => (
        <div className={styles.notificationsContainer}>
          <div className={`${styles.toast} ${styles.error}`} ref={toastRef}>
            <div className={styles.flex}>
              <div className={styles.flexShrink0}>
                <svg
                  className={styles.errorSvg}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className={styles.promptWrap}>
                <p className={styles.promptHeading}>Error al Actualizar</p>
                <div className={styles.promptDescription}>
                  <p>
                    {message} <small>({error})</small>
                  </p>
                  {audioError && <p className={styles.audioError}>{audioError}</p>}
                </div>
                <div className={styles.buttonContainer}>
                  {onAction && actionLabel && (
                    <button
                      type="button"
                      className={styles.actionButton}
                      onClick={() => {
                        console.log("[FailAlert] Action button clicked, dismissing toast:", id);
                        onAction();
                        sonnerToast.dismiss(id);
                      }}
                    >
                      {actionLabel}
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.dismissButton}
                    onClick={() => {
                      console.log("[FailAlert] Close button clicked, dismissing toast:", id);
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
          console.log("[FailAlert] Toast dismissed, triggering onClose, toastId:", id);
          onClose();
          if (audioRef.current && isPlaying.current) {
            console.log("[FailAlert] Pausing audio on dismiss");
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            isPlaying.current = false;
          }
        },
        onAutoClose: () => {
          console.log("[FailAlert] Toast auto-closed after 5s, toastId:", id);
        },
        style: { zIndex: 10002, opacity: 1 },
      }
    );

    setToastId(id);
    console.log("[FailAlert] Toast created with ID:", id);

    return () => {
      console.log("[FailAlert] Component unmounting, cleaning up, toastId:", id);
      setIsMounted(false);
      sonnerToast.dismiss(id);
      if (audioRef.current && isPlaying.current && !audioRef.current.paused) {
        console.log("[FailAlert] Pausing audio on cleanup");
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        isPlaying.current = false;
      }
      hasRenderedToast.current = false;
    };
  }, [message, error, onClose, onAction, actionLabel]);

  useEffect(() => {
    if (toastRef.current && isMounted) {
      console.log("[FailAlert] Applying GSAP animation to toastRef");
      gsap.fromTo(
        toastRef.current,
        { opacity: 0, x: 50 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          ease: "power2.out",
          onStart: () => console.log("[FailAlert] GSAP animation started"),
          onComplete: () => {
            console.log("[FailAlert] GSAP animation completed");
            playAudio();
          },
        }
      );

      const computedStyles = window.getComputedStyle(toastRef.current);
      console.log("[FailAlert] Toast computed styles:", {
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

export default FailAlert;