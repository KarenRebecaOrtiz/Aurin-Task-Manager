import { ClerkProvider } from '@clerk/nextjs';
import { Toaster } from 'sonner';
import './globals.scss';

export const metadata = {
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
      <html lang="es">
        <head>
          <link
            href="https://fonts.googleapis.com/css2?family=Urbanist:wght@400;500;700&display=swap"
            rel="stylesheet"
          />
          <link rel="apple-touch-icon" sizes="180x180" href="/favicon/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon/favicon-16x16.png" />
          <link rel="manifest" href="/favicon/site.webmanifest" />
          <link rel="shortcut icon" href="/favicon/favicon.ico" />
          <link rel="icon" type="image/png" sizes="192x192" href="/favicon/android-chrome-192x192.png" />
          <link rel="icon" type="image/png" sizes="512x512" href="/favicon/android-chrome-512x512.png" />
          <meta name="theme-color" content="#ffffff" />
        </head>
        <body>
          {children}
          <Toaster position="top-center" />
          <div id="portal-root" />
          <svg style={{ position: 'absolute', width: 0, height: 0 }} aria-hidden>
            <filter id="frosted" primitiveUnits="objectBoundingBox">
              <feImage href="[BASE64_IMAGE_URL]" x="0" y="0" width="1" height="1" result="map"/>
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.02" result="blur"/>
              <feDisplacementMap id="disp" in="blur" in2="map" scale="1" xChannelSelector="R" yChannelSelector="G">
                <animate attributeName="scale" to="1.4" dur="0.3s" begin="timerPanel.mouseover" fill="freeze"/>
                <animate attributeName="scale" to="1" dur="0.3s" begin="timerPanel.mouseout" fill="freeze"/>
              </feDisplacementMap>
            </filter>
          </svg>
        </body>
      </html>
    </ClerkProvider>
  );
}