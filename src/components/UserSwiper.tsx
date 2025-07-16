"use client";

import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";
import styles from "./UserSwiper.module.scss";
import UserAvatar from "./ui/UserAvatar";
import { useUserSwiperData, useUserSwiperActions, User } from "@/stores/userSwiperStore";
import { useUserSwiperSync } from "@/hooks/useUserSwiperSync";

interface UserSwiperProps {
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onMessageSidebarOpen: (user: User) => void;
  className?: string;
}

const UserSwiper = ({ onOpenProfile, onMessageSidebarOpen, className }: UserSwiperProps) => {
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  // ✅ Usar el hook de sincronización que evita re-renders
  useUserSwiperSync();

  // ✅ Consumir datos del userSwiperStore optimizado
  const { clerkUsers, isLoading } = useUserSwiperData();
  const { getStoreUserById } = useUserSwiperActions();

  useEffect(() => {
    if (splideRef.current && clerkUsers.length > 0) {
      splideInstance.current = new Splide(splideRef.current, {
        type: "loop",
        perPage: 2,
        perMove: 1,
        gap: "0.5rem",
        autoWidth: true,
        focus: "center",
        autoplay: true,
        interval: 3000,
        pauseOnHover: true,
        pauseOnFocus: true,
        drag: true,
        arrows: false,
        pagination: false,
        mediaQuery: "min",
        breakpoints: {
          360: { perPage: 2, gap: "0.5rem" },
          480: { perPage: 3, gap: "0.75rem" },
          768: { perPage: 4, gap: "1rem", focus: 0 },
          992: { perPage: 5, gap: "1.25rem" },
          1200: { perPage: 6, gap: "1.5rem" },
        },
      }).mount();

      return () => {
        if (splideInstance.current) {
          splideInstance.current.destroy();
        }
      };
    }
  }, [clerkUsers]);

  if (isLoading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loader}>Cargando...</div>
      </div>
    );
  }

  if (clerkUsers.length === 0) {
    return <div className={styles.loading}>No hay usuarios disponibles</div>;
  }

  return (
    <section
      ref={splideRef}
      className={`splide ${styles.swiperContainer} ${className || ""}`}
      aria-label="Usuarios activos"
    >
      <div className="splide__track">
        <ul className="splide__list">
          {clerkUsers.map((user) => (
            <li className="splide__slide" key={user.id}>
              <div
                className={styles.card}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const storeUser = getStoreUserById(user.id);
                  if (!storeUser) return;
                  onMessageSidebarOpen({
                    id: storeUser.id,
                    imageUrl: storeUser.imageUrl,
                    fullName: storeUser.fullName,
                    role: storeUser.role,
                  });
                }}
                aria-label={`Enviar mensaje a ${user.firstName || "Usuario"}`}
              >
                <div className={styles.cardInfo}>
                  <div className={styles.avatarWrapper}>
                    <button
                      className={styles.cardAvatar}
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenProfile({
                          id: user.id,
                          imageUrl: user.imageUrl || "",
                        });
                      }}
                      aria-label={`Ver perfil de ${user.firstName || "Usuario"}`}
                    >
                      <UserAvatar
                        userId={user.id}
                        imageUrl={user.imageUrl}
                        userName={`${user.firstName || ""} ${user.lastName || ""}`.trim() || "Usuario"}
                        size="medium"
                        showStatus={true}
                      />
                    </button>
                  </div>
                  <div className={styles.cardText}>
                    <div className={styles.cardTitle}>
                      {(user.firstName || user.lastName)
                        ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                        : "Sin nombre"}
                    </div>
                    <div className={styles.cardStatus}>
                      {user.role === 'user' ? 'No Especificado' : (user.role || 'Sin rol')}
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default UserSwiper;