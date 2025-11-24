"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { dropdownAnimations } from "@/modules/shared/components/molecules/Dropdown/animations";
import styles from "./crystal-phone-select.module.scss";

const countries = [
  { code: "+1", country: "United States", flag: "🇺🇸", iso: "US" },
  { code: "+1", country: "Canada", flag: "🇨🇦", iso: "CA" },
  { code: "+52", country: "Mexico", flag: "🇲🇽", iso: "MX" },
  { code: "+54", country: "Argentina", flag: "🇦🇷", iso: "AR" },
  { code: "+55", country: "Brazil", flag: "🇧🇷", iso: "BR" },
  { code: "+56", country: "Chile", flag: "🇨🇱", iso: "CL" },
  { code: "+57", country: "Colombia", flag: "🇨🇴", iso: "CO" },
  { code: "+58", country: "Venezuela", flag: "🇻🇪", iso: "VE" },
  { code: "+51", country: "Peru", flag: "🇵🇪", iso: "PE" },
  { code: "+593", country: "Ecuador", flag: "🇪🇨", iso: "EC" },
  { code: "+591", country: "Bolivia", flag: "🇧🇴", iso: "BO" },
  { code: "+595", country: "Paraguay", flag: "🇵🇾", iso: "PY" },
  { code: "+598", country: "Uruguay", flag: "🇺🇾", iso: "UY" },
  { code: "+34", country: "Spain", flag: "🇪🇸", iso: "ES" },
  { code: "+33", country: "France", flag: "🇫🇷", iso: "FR" },
  { code: "+49", country: "Germany", flag: "🇩🇪", iso: "DE" },
  { code: "+39", country: "Italy", flag: "🇮🇹", iso: "IT" },
  { code: "+44", country: "United Kingdom", flag: "🇬🇧", iso: "GB" },
  { code: "+351", country: "Portugal", flag: "🇵🇹", iso: "PT" },
  { code: "+31", country: "Netherlands", flag: "🇳🇱", iso: "NL" },
  { code: "+32", country: "Belgium", flag: "🇧🇪", iso: "BE" },
  { code: "+41", country: "Switzerland", flag: "🇨🇭", iso: "CH" },
  { code: "+43", country: "Austria", flag: "🇦🇹", iso: "AT" },
  { code: "+45", country: "Denmark", flag: "🇩🇰", iso: "DK" },
  { code: "+46", country: "Sweden", flag: "🇸🇪", iso: "SE" },
  { code: "+47", country: "Norway", flag: "🇳🇴", iso: "NO" },
  { code: "+358", country: "Finland", flag: "🇫🇮", iso: "FI" },
  { code: "+86", country: "China", flag: "🇨🇳", iso: "CN" },
  { code: "+81", country: "Japan", flag: "🇯🇵", iso: "JP" },
  { code: "+82", country: "South Korea", flag: "🇰🇷", iso: "KR" },
  { code: "+91", country: "India", flag: "🇮🇳", iso: "IN" },
  { code: "+61", country: "Australia", flag: "🇦🇺", iso: "AU" },
  { code: "+64", country: "New Zealand", flag: "🇳🇿", iso: "NZ" },
  { code: "+7", country: "Russia", flag: "🇷🇺", iso: "RU" },
  { code: "+380", country: "Ukraine", flag: "🇺🇦", iso: "UA" },
  { code: "+48", country: "Poland", flag: "🇵🇱", iso: "PL" },
  { code: "+420", country: "Czech Republic", flag: "🇨🇿", iso: "CZ" },
  { code: "+36", country: "Hungary", flag: "🇭🇺", iso: "HU" },
  { code: "+40", country: "Romania", flag: "🇷🇴", iso: "RO" },
  { code: "+359", country: "Bulgaria", flag: "🇧🇬", iso: "BG" },
  { code: "+385", country: "Croatia", flag: "🇭🇷", iso: "HR" },
  { code: "+381", country: "Serbia", flag: "🇷🇸", iso: "RS" },
  { code: "+30", country: "Greece", flag: "🇬🇷", iso: "GR" },
  { code: "+90", country: "Turkey", flag: "🇹🇷", iso: "TR" },
  { code: "+972", country: "Israel", flag: "🇮🇱", iso: "IL" },
  { code: "+971", country: "United Arab Emirates", flag: "🇦🇪", iso: "AE" },
  { code: "+966", country: "Saudi Arabia", flag: "🇸🇦", iso: "SA" },
  { code: "+20", country: "Egypt", flag: "🇪🇬", iso: "EG" },
  { code: "+27", country: "South Africa", flag: "🇿🇦", iso: "ZA" },
  { code: "+234", country: "Nigeria", flag: "🇳🇬", iso: "NG" },
  { code: "+254", country: "Kenya", flag: "🇰🇪", iso: "KE" },
  { code: "+60", country: "Malaysia", flag: "🇲🇾", iso: "MY" },
  { code: "+65", country: "Singapore", flag: "🇸🇬", iso: "SG" },
  { code: "+66", country: "Thailand", flag: "🇹🇭", iso: "TH" },
  { code: "+84", country: "Vietnam", flag: "🇻🇳", iso: "VN" },
  { code: "+63", country: "Philippines", flag: "🇵🇭", iso: "PH" },
  { code: "+62", country: "Indonesia", flag: "🇮🇩", iso: "ID" },
];

export interface CrystalPhoneSelectProps {
  value?: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  error?: string;
  className?: string;
}

const CrystalPhoneSelect = React.forwardRef<HTMLDivElement, CrystalPhoneSelectProps>(
  ({ value = "+52", onChange, label, disabled = false, error, className = "" }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");
    const wrapperRef = React.useRef<HTMLDivElement>(null);
    const searchInputRef = React.useRef<HTMLInputElement>(null);
    const generatedId = React.useId();

    const selectedCountry = countries.find((c) => c.code === value);

    React.useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
          setSearchTerm("");
        }
      }
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    React.useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, [isOpen]);

    const filteredCountries = countries.filter(
      (c) =>
        c.country.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.code.includes(searchTerm)
    );

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
            aria-haspopup="listbox"
            aria-expanded={isOpen}
          >
            {selectedCountry ? (
              <span className={styles.selectedCountry}>
                <span className={styles.flag}>{selectedCountry.flag}</span>
                <span>{selectedCountry.code}</span>
              </span>
            ) : (
              <span className={styles.placeholder}>Select Code</span>
            )}
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
              <motion.div {...dropdownAnimations.menu} className={styles.menu} role="listbox">
                <div className={styles.searchContainer}>
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className={styles.countryList}>
                  {filteredCountries.map((country, idx) => (
                    <motion.div
                      key={`${country.iso}-${country.code}`}
                      {...dropdownAnimations.item(idx)}
                      onClick={() => {
                        onChange(country.code);
                        setIsOpen(false);
                        setSearchTerm("");
                      }}
                      className={`${styles.countryItem} ${country.code === value ? styles.selected : ''}`}
                      role="option"
                      aria-selected={country.code === value}
                    >
                      <span className={styles.countryFlag}>{country.flag}</span>
                      <span className={styles.countryName}>{country.country}</span>
                      <span className={styles.countryCode}>{country.code}</span>
                    </motion.div>
                  ))}
                </div>
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
CrystalPhoneSelect.displayName = "CrystalPhoneSelect";

export { CrystalPhoneSelect };
