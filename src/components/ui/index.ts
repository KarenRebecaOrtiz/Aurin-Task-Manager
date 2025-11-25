// ==============================================================
// DESIGN SYSTEM - Global UI Components
// ==============================================================

// Typography Components (shadcn/ui standards)
export {
  H1,
  H2,
  H3,
  H4,
  P,
  Lead,
  Large,
  Small,
  Muted,
  InlineCode,
  Blockquote,
  List,
  ListItem,
} from './Typography';

// Crystallized Input Components (shadcn/ui + crystallized texture)
export { CrystalInput } from './inputs/crystal-input';
export type { CrystalInputProps } from './inputs/crystal-input';

export { CrystalTextarea } from './inputs/crystal-textarea';
export type { CrystalTextareaProps } from './inputs/crystal-textarea';

export { CrystalSelect } from './inputs/crystal-select';
export type { CrystalSelectProps } from './inputs/crystal-select';

export { CrystalSearchableDropdown } from './inputs/crystal-searchable-dropdown';
export type { CrystalSearchableDropdownProps, CrystalDropdownItem } from './inputs/crystal-searchable-dropdown';

export { CrystalDropdown } from './inputs/crystal-dropdown';
export type { CrystalDropdownProps, CrystalDropdownItem as CrystalDropdownItemType } from './inputs/crystal-dropdown';

export { CrystalPhoneSelect } from './inputs/crystal-phone-select';
export type { CrystalPhoneSelectProps } from './inputs/crystal-phone-select';

export { CrystalCalendarDropdown } from './inputs/crystal-calendar-dropdown';
export type { CrystalCalendarDropdownProps } from './inputs/crystal-calendar-dropdown';

export { CrystalRadioSelector } from './inputs/crystal-radio-selector';
export type { CrystalRadioSelectorProps, RadioOption } from './inputs/crystal-radio-selector';

// Accessibility Components
export { VisuallyHidden } from './visually-hidden';
