import { type Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Aurin Task Manager',
  description: 'Gestión de proyectos para tu equipo',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang='es'>
        <head>
          {/* Tipografía */}
          <link
            href='https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;700&display=swap'
            rel='stylesheet'
          />

          {/* Favicon y meta tags */}
          <link rel='apple-touch-icon' sizes='180x180' href='/favicon/apple-touch-icon.png' />
          <link rel='icon' type='image/png' sizes='32x32' href='/favicon/favicon-32x32.png' />
          <link rel='icon' type='image/png' sizes='16x16' href='/favicon/favicon-16x16.png' />
          <link rel='manifest' href='/favicon/site.webmanifest' />
          <link rel='shortcut icon' href='/favicon/favicon.ico' />
          <link rel='icon' type='image/png' sizes='192x192' href='/favicon/android-chrome-192x192.png' />
          <link rel='icon' type='image/png' sizes='512x512' href='/favicon/android-chrome-512x512.png' />
          <meta name='theme-color' content='#ffffff' />
        </head>
        <body>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}