/**
 * Phone Input Module - Public API
 *
 * Re-exports from the phone-number-input atomic structure
 * for easier consumption within the config module
 */

export {
  PhoneNumberInput,
  type PhoneNumberInputProps,
  type PhoneNumberValue,
  CountrySelect,
  type CountrySelectProps,
  FlagIcon,
  type FlagIconProps,
  countries,
  getCountryByCode,
  getCountryByDialCode,
  getDefaultCountry,
  type Country,
} from '../../phone-number-input/components/phone-input'
