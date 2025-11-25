"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import Image from "next/image"
import { FlagIcon } from "../atoms/flag-icon"
import { countries, type Country } from "../data/countries"
import { dropdownAnimations } from "@/modules/shared/components/molecules/Dropdown/animations"
import styles from "./country-select.module.scss"

/**
 * CountrySelect Molecule
 *
 * WHY: A searchable dropdown for country selection that prioritizes UX:
 * - Visual: Shows flag + dial code for quick recognition
 * - Search: Allows filtering by country name or dial code
 * - Accessibility: Full keyboard navigation (Arrow keys, Enter, Escape)
 *
 * The popover pattern is chosen over native select for better styling control
 * and consistent cross-browser behavior.
 */

export interface CountrySelectProps {
  /** Currently selected country code */
  value: string
  /** Callback when country changes */
  onChange: (country: Country) => void
  /** Whether the select is disabled */
  disabled?: boolean
  /** Whether the parent has an error state */
  hasError?: boolean
  /** Additional class names */
  className?: string
}

export const CountrySelect: React.FC<CountrySelectProps> = ({
  value,
  onChange,
  disabled = false,
  hasError = false,
  className,
}) => {
  const [isOpen, setIsOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)

  const containerRef = React.useRef<HTMLDivElement>(null)
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLUListElement>(null)

  // Find the currently selected country
  const selectedCountry = React.useMemo(() => countries.find((c) => c.code === value) || countries[0], [value])

  // Filter countries based on search query
  const filteredCountries = React.useMemo(() => {
    if (!searchQuery) return countries
    const query = searchQuery.toLowerCase()
    return countries.filter(
      (country) =>
        country.name.toLowerCase().includes(query) ||
        country.dialCode.includes(query) ||
        country.code.toLowerCase().includes(query),
    )
  }, [searchQuery])

  // Reset highlighted index when filtered list changes
  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredCountries])

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [isOpen])

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (isOpen && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement
      highlightedElement?.scrollIntoView({ block: "nearest" })
    }
  }, [highlightedIndex, isOpen])

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery("")
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault()
        if (!isOpen) {
          setIsOpen(true)
        } else {
          setHighlightedIndex((prev) => (prev < filteredCountries.length - 1 ? prev + 1 : prev))
        }
        break
      case "ArrowUp":
        event.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
        break
      case "Enter":
        event.preventDefault()
        if (isOpen && filteredCountries[highlightedIndex]) {
          handleSelect(filteredCountries[highlightedIndex])
        } else {
          setIsOpen(true)
        }
        break
      case "Escape":
        event.preventDefault()
        setIsOpen(false)
        setSearchQuery("")
        break
      case "Tab":
        setIsOpen(false)
        setSearchQuery("")
        break
    }
  }

  const handleSelect = (country: Country) => {
    onChange(country)
    setIsOpen(false)
    setSearchQuery("")
  }

  return (
    <div ref={containerRef} className={`${styles.dropdownWrapper} ${className || ''}`}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select country, current: ${selectedCountry.name}`}
        className={`${styles.trigger} ${disabled ? styles.disabled : ''} ${hasError ? styles.error : ''}`}
      >
        <FlagIcon countryCode={selectedCountry.code} size="md" />
        <span className={styles.dialCode}>{selectedCountry.dialCode}</span>
        <Image
          src="/chevron-down.svg"
          alt="arrow"
          width={16}
          height={16}
          className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
        />
      </button>

      {/* Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div {...dropdownAnimations.menu} className={styles.menu} role="listbox">
            {/* Search Input */}
            <div className={styles.searchContainer}>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Buscar países..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className={styles.searchInput}
              />
            </div>

            {/* Country List */}
            <ul ref={listRef} role="listbox" aria-label="Countries" className={styles.countryList}>
              {filteredCountries.length === 0 ? (
                <li className={styles.noResults}>No se encontraron países</li>
              ) : (
                filteredCountries.map((country, index) => (
                  <motion.li
                    key={country.code}
                    {...dropdownAnimations.item(index)}
                    role="option"
                    aria-selected={country.code === value}
                    onClick={() => handleSelect(country)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`${styles.countryItem} ${country.code === value ? styles.selected : ''}`}
                  >
                    <FlagIcon countryCode={country.code} size="md" />
                    <span className={styles.countryName}>{country.name}</span>
                    <span className={styles.countryCode}>{country.dialCode}</span>
                  </motion.li>
                ))
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

CountrySelect.displayName = "CountrySelect"
