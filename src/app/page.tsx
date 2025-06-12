// src/app/layout.tsx
'use client';

import './globals.css';
import 'lenis/dist/lenis.css';
import { Inter } from 'next/font/google';
import { useLenis } from '@/lib/useLenis';
import { ClerkProvider } from '@clerk/nextjs';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useLenis();

  return (
    <html lang="en">
      <body className={inter.className}>
        <ClerkProvider>{children}</ClerkProvider>
      </body>
    </html>
  );
}