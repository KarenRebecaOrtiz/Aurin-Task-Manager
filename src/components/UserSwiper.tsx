"use client";

import { useEffect, useRef } from "react";
import Splide from "@splidejs/splide";
import "@splidejs/splide/css/core";
import styles from "./UserSwiper.module.scss";
import UserAvatar from "./ui/UserAvatar";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useDataStore } from "@/stores/dataStore";

interface ClerkUser {
  id: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
}

interface User {
  id: string;
  imageUrl: string;
  fullName: string;
  role: string;
}

interface UserSwiperProps {
  onOpenProfile: (user: { id: string; imageUrl: string }) => void;
  onMessageSidebarOpen: (user: User) => void;
  className?: string;
}

const statusColors = {
  Disponible: "#28a745",
  Ocupado: "#dc3545",
  "Por terminar": "#ff6f00",
  Fuera: "#616161",
};

const UserSwiper = ({ onOpenProfile, onMessageSidebarOpen, className }: UserSwiperProps) => {
  const splideRef = useRef<HTMLDivElement>(null);
  const splideInstance = useRef<Splide | null>(null);

  // Consumir usuarios del dataStore centralizado
  const { users: storeUsers, isLoadingUsers } = useStore(
    useDataStore,
    useShallow((state) => ({
      users: state.users,
      isLoadingUsers: state.isLoadingUsers,
    }))
  );

  // Convertir usuarios del store al formato que necesita UserSwiper
  const users: ClerkUser[] = storeUsers.map((storeUser) => ({
    id: storeUser.id,
    imageUrl: storeUser.imageUrl,
    firstName: storeUser.fullName.split(" ")[0] || "",
    lastName: storeUser.fullName.split(" ").slice(1).join(" ") || "",
    status: "Disponible", // Default status, se puede obtener de Firestore si es necesario
  }));

  useEffect(() => {
    if (splideRef.current && users.length > 0) {
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
  }, [users]);

  if (isLoadingUsers) {
    return (
      <div className={styles.loading}>
        <div className={styles.loader}>Cargando...</div>
      </div>
    );
  }

  if (users.length === 0) {
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
          {users.map((user) => (
            <li className="splide__slide" key={user.id}>
              <div
                className={styles.card}
                role="button"
                tabIndex={0}
                onClick={() => {
                  const storeUser = storeUsers.find((u) => u.id === user.id);
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
                    <div
                      className={styles.cardStatus}
                      style={{
                        color: statusColors[user.status as keyof typeof statusColors] || "#333",
                      }}
                    >
                      {user.status || "Disponible"}
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