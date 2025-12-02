import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import styles from '../Footer.module.scss';

interface QuickLink {
  href: string;
  icon: string;
  alt: string;
  isPng?: boolean;
  adminOnly?: boolean;
}

const quickLinks: QuickLink[] = [
  {
    href: 'https://aurin-payload-cms.vercel.app/admin',
    icon: 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/PayloadIconWhite.svg',
    alt: 'Payload CMS',
    adminOnly: true,
  },
  {
    href: 'https://app.sesametime.com/employee/portal',
    icon: 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/Sesame_Isotipo_Dark.png',
    alt: 'Sesame Time',
    isPng: true,
  },
  {
    href: 'https://mail.zoho.com/zm/',
    icon: 'https://pub-d17bbbdbf8e348c5a57c8168ad69c92f.r2.dev/zoho-logo-white.svg',
    alt: 'Zoho Mail',
  },
];

export const QuickLinks: React.FC = () => {
  const { isAdmin } = useAuth();

  const visibleLinks = quickLinks.filter((link) => !link.adminOnly || isAdmin);

  return (
    <div className={styles.quickLinksContainer}>
      {visibleLinks.map((link) => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.quickLinkButton}
          title={link.alt}
        >
          <Image
            src={link.icon}
            alt={link.alt}
            width={20}
            height={20}
            className={link.isPng ? styles.pngIcon : undefined}
            unoptimized
          />
        </a>
      ))}
    </div>
  );
};
