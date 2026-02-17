'use client';

import { Toaster } from 'sileo';
import { useTheme } from '@/contexts/ThemeContext';
import type { ComponentProps } from 'react';

type ToasterProps = Omit<ComponentProps<typeof Toaster>, 'options'>;

const FILL_LIGHT = 'rgba(255, 255, 255, 0.92)';
const FILL_DARK = 'rgba(27, 27, 30, 0.92)';

export default function ThemedToaster(props: ToasterProps) {
  const { isDarkMode } = useTheme();

  return (
    <Toaster
      {...props}
      options={{ fill: isDarkMode ? FILL_DARK : FILL_LIGHT }}
    />
  );
}
