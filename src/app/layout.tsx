import { type Metadata } from 'next';
import { ClerkProvider, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import './globals.scss';

export const metadata: Metadata = {
  title: 'Sodio Plattform',
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
        <body>
          <header style={{ padding: '1rem', textAlign: 'right' }}>
            <SignedIn>
              <UserButton />
            </SignedIn>
          </header>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
