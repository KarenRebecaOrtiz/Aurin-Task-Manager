"use client";

import * as React from "react";
import { motion } from "framer-motion";
import styles from "./crystal-radio-selector.module.scss";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  color?: string; // Color del dot indicator (e.g., 'blue', 'amber', 'red')
}

export interface CrystalRadioSelectorProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  error?: string;
  columns?: 1 | 2 | 3;
}

const fadeInUp = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const CrystalRadioSelector = React.forwardRef<HTMLDivElement, CrystalRadioSelectorProps>(
  (
    {
      options,
      value,
      onChange,
      label,
      required = false,
      disabled = false,
      className = "",
      error,
      columns = 3,
    },
    ref
  ) => {
    const generatedId = React.useId();

    const getColorClass = (color?: string) => {
      switch (color) {
        case 'blue':
          return styles.colorBlue;
        case 'amber':
          return styles.colorAmber;
        case 'red':
          return styles.colorRed;
        case 'green':
          return styles.colorGreen;
        default:
          return styles.colorBlue;
      }
    };

    const getGridClass = () => {
      switch (columns) {
        case 1:
          return styles.gridCols1;
        case 2:
          return styles.gridCols2;
        case 3:
          return styles.gridCols3;
        default:
          return styles.gridCols3;
      }
    };

    return (
      <div className={`${styles.container} ${className}`} ref={ref}>
        {label && (
          <label htmlFor={generatedId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}

        <div
          role="radiogroup"
          aria-required={required}
          className={`${styles.radioGroup} ${getGridClass()}`}
          id={generatedId}
        >
          {options.map((option, index) => {
            const isSelected = value === option.value;
            const optionId = `${generatedId}-${option.value}`;

            return (
              <motion.label
                key={option.value}
                htmlFor={optionId}
                className={`${styles.option} ${isSelected ? styles.selected : ''} ${disabled ? styles.disabled : ''}`}
                initial="hidden"
                animate="visible"
                variants={fadeInUp}
                transition={{ delay: index * 0.05 }}
              >
                <div className={styles.optionContent}>
                  <div className={styles.radioWrapper}>
                    <input
                      type="radio"
                      id={optionId}
                      value={option.value}
                      checked={isSelected}
                      onChange={(e) => !disabled && onChange(e.target.value)}
                      disabled={disabled}
                      className={styles.radioInput}
                    />
                    <div className={styles.radioButton}>
                      {isSelected && <div className={styles.radioInner} />}
                    </div>
                  </div>

                  <div className={styles.optionText}>
                    <div className={styles.optionHeader}>
                      {option.color && (
                        <div className={`${styles.colorDot} ${getColorClass(option.color)}`} />
                      )}
                      <span className={styles.optionLabel}>{option.label}</span>
                    </div>
                    {option.description && (
                      <p className={styles.optionDescription}>{option.description}</p>
                    )}
                  </div>
                </div>
              </motion.label>
            );
          })}
        </div>

        {error && (
          <span className={styles.errorText} role="alert">
            {error}
          </span>
        )}
      </div>
    );
  }
);
CrystalRadioSelector.displayName = "CrystalRadioSelector";

export { CrystalRadioSelector };
