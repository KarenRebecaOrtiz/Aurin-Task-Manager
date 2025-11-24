"use client"

import { ReactNode } from "react"
import styles from "./FormSection.module.scss"

interface FormSectionProps {
  title?: string
  children: ReactNode
  className?: string
}

export function FormSection({
  title,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <div className={`${styles.formSection} ${className}`}>
      {title && <h3 className={styles.title}>{title}</h3>}
      <div className={styles.fieldsGrid}>
        {children}
      </div>
    </div>
  )
}
