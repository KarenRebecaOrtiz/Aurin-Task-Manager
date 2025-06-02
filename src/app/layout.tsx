// src/app/layout.tsx
import { ClerkProvider } from '@clerk/nextjs';
import '@/app/globals.scss';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}