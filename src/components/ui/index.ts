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
export { CrystalInput } from './crystal-input';
export type { CrystalInputProps } from './crystal-input';

export { CrystalTextarea } from './crystal-textarea';
export type { CrystalTextareaProps } from './crystal-textarea';

export { CrystalSelect } from './crystal-select';
export type { CrystalSelectProps } from './crystal-select';

export { CrystalSearchableDropdown } from './crystal-searchable-dropdown';
export type { CrystalSearchableDropdownProps, CrystalDropdownItem } from './crystal-searchable-dropdown';

export { CrystalPhoneSelect } from './crystal-phone-select';
export type { CrystalPhoneSelectProps } from './crystal-phone-select';
