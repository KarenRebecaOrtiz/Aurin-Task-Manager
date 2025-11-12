import { ClerkProvider } from "@clerk/nextjs";
import Script from "next/script";
import { Urbanist } from "next/font/google";
import "./globals.scss";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ModalProvider } from "@/modules/modal";
import { SonnerToaster } from "@/modules/sonner";

const urbanist = Urbanist({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--font-urbanist",
});

export const metadata = {
  title: "Aurin Task Manager",
  description: "Gestión de proyectos para tu equipo",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <ThemeProvider>
        <html lang="es">
          <head>
            <link
              rel="apple-touch-icon"
              sizes="512x512"
              href="/aurin.jpg"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="32x32"
              href="/favicon/favicon-32x32.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="16x16"
              href="/favicon/favicon-16x16.png"
            />
            <link rel="manifest" href="/site.webmanifest" />
            <link rel="shortcut icon" href="/favicon/favicon.ico" />
            <link
              rel="icon"
              type="image/png"
              sizes="192x192"
              href="/favicon/android-chrome-192x192.png"
            />
            <link
              rel="icon"
              type="image/jpeg"
              sizes="512x512"
              href="/aurin.jpg"
            />
            <meta name="theme-color" content="#d3df48" />
            <meta name="apple-mobile-web-app-capable" content="yes" />
            <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            <meta name="apple-mobile-web-app-title" content="Aurin" />
            <meta name="mobile-web-app-capable" content="yes" />
            <meta name="msapplication-TileColor" content="#d3df48" />
            <meta name="msapplication-tap-highlight" content="no" />
            <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
            <meta name="application-name" content="Aurin Task Manager" />
            <meta name="msapplication-TileImage" content="/aurin.jpg" />
            <Script
              src={`https://www.google.com/recaptcha/api.js?render=6Lcxe2UrAAAAAANiSWaLO_46zSm09wRhuYOEHfeb`}
              strategy="beforeInteractive"
            />
          </head>
          <body className={`${urbanist.className} ${urbanist.variable}`}>
            <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
              <defs>
                <filter id="grayscale">
                  <feColorMatrix
                    type="matrix"
                    values="0.3333 0.3333 0.3333 0 0
                            0.3333 0.3333 0.3333 0 0
                            0.3333 0.3333 0.3333 0 0
                            0      0      0      1 0"
                  />
                  <feComponentTransfer>
                    <feFuncR type="linear" slope="1.2" intercept="-0.1" />
                    <feFuncG type="linear" slope="1.2" intercept="-0.1" />
                    <feFuncB type="linear" slope="1.2" intercept="-0.1" />
                  </feComponentTransfer>
                </filter>
              </defs>
            </svg>
            <ModalProvider>
              {children}
            </ModalProvider>
            <SonnerToaster />
            <div id="portal-root" />
          </body>
        </html>
      </ThemeProvider>
    </ClerkProvider>
  );
}