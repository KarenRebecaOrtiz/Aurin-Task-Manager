import { countries as countriesData } from 'countries-list'

/**
 * Country Data using countries-list
 *
 * WHY: Uses the countries-list library which is:
 * - Very small and lightweight
 * - Tree-shakeable for optimal bundle size
 * - Frequently updated with accurate country data
 * - Provides comprehensive country information including dial codes
 */

export interface Country {
  /** Country name for display and search */
  name: string
  /** ISO 3166-1 alpha-2 country code */
  code: string
  /** International dialing code */
  dialCode: string
}

/**
 * Transform countries-list data into our Country interface
 * Sorted alphabetically by name for better UX
 */
export const countries: Country[] = Object.entries(countriesData)
  .map(([code, data]) => ({
    name: data.name,
    code: code,
    dialCode: `+${data.phone[0]}`, // Use first phone code if multiple exist
  }))
  .filter((country) => country.dialCode !== '+0') // Filter out invalid entries
  .sort((a, b) => a.name.localeCompare(b.name))

/**
 * Get a country by its ISO code
 */
export function getCountryByCode(code: string): Country | undefined {
  return countries.find((c) => c.code.toUpperCase() === code.toUpperCase())
}

/**
 * Get a country by its dial code (lada)
 */
export function getCountryByDialCode(dialCode: string): Country | undefined {
  return countries.find((c) => c.dialCode === dialCode)
}

/**
 * Get the default country (Mexico) or fallback to first in list
 */
export function getDefaultCountry(): Country {
  return getCountryByCode("MX") || countries[0]
}
