"use client";

import { toast as sonnerToast } from "sonner";
import styles from "./toast.module.scss";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: "default" | "error" | "success" | "info";
}

export const toast = ({ title, description, variant = "default" }: ToastOptions) => {
  sonnerToast.custom(() => (
    <div className={`${styles.toast} ${styles[variant]}`}>
      <div className={styles.title}>{title}</div>
      {description && <div className={styles.description}>{description}</div>}
    </div>
  ));
};