"use client";

import React from "react";
import styles from "./LoadingDots.module.scss";

interface LoadingDotsProps {
  text?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function LoadingDots({ 
  text = "Cargando", 
  size = "md", 
  className = "" 
}: LoadingDotsProps) {
  return (
    <div className={`${styles.loadingDots} ${styles[size]} ${className}`}>
      <span className={styles.text}>{text}</span>
      <span className={styles.dots}>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
        <span className={styles.dot}></span>
      </span>
    </div>
  );
}

export default LoadingDots; 