"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { format } from "date-fns";
import "react-day-picker/style.css";
import { dropdownAnimations } from "@/modules/shared/components/molecules/Dropdown/animations";
import styles from "./crystal-calendar-dropdown.module.scss";

export interface CrystalCalendarDropdownProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
}

const CrystalCalendarDropdown = React.forwardRef<HTMLDivElement, CrystalCalendarDropdownProps>(
  (
    {
      value,
      onChange,
      label,
      placeholder = "Selecciona una fecha",
      disabled = false,
      className = "",
      error,
      minDate,
      maxDate,
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const generatedId = React.useId();

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const handleSelect = (date: Date | undefined) => {
      onChange(date);
      setIsOpen(false);
    };

    const formatDisplayDate = (date: Date | undefined) => {
      if (!date) return placeholder;
      return format(date, "dd/MM/yyyy", { locale: es });
    };

    return (
      <div className={`${styles.container} ${className}`} ref={ref}>
        {label && (
          <label htmlFor={generatedId} className={styles.label}>
            {label}
          </label>
        )}

        <div className={styles.dropdownWrapper} ref={wrapperRef}>
          <button
            id={generatedId}
            type="button"
            className={`${styles.trigger} ${error ? styles.error : ''}`}
            onClick={() => !disabled && setIsOpen(!isOpen)}
            disabled={disabled}
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <div className={styles.triggerContent}>
              <svg
                className={styles.calendarIcon}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M8 2v3M16 2v3M3.5 9.09h17M21 8.5V17c0 3-1.5 5-5 5H8c-3.5 0-5-2-5-5V8.5c0-3 1.5-5 5-5h8c3.5 0 5 2 5 5z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeMiterlimit="10"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span className={`${styles.triggerText} ${!value ? styles.placeholder : ''}`}>
                {formatDisplayDate(value)}
              </span>
            </div>
            <Image
              src="/chevron-down.svg"
              alt="arrow"
              width={16}
              height={16}
              className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
            />
          </button>

          <AnimatePresence>
            {isOpen && (
              <motion.div {...dropdownAnimations.menu} className={styles.calendar} role="dialog">
                <DayPicker
                  mode="single"
                  selected={value}
                  onSelect={handleSelect}
                  locale={es}
                  className={styles.dayPicker}
                  disabled={(date) => {
                    if (minDate && date < minDate) return true;
                    if (maxDate && date > maxDate) return true;
                    return false;
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
CrystalCalendarDropdown.displayName = "CrystalCalendarDropdown";

export { CrystalCalendarDropdown };
