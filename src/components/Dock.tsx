import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import styles from './Dock.module.scss';
import Image from 'next/image';

interface Shortcut {
  name: string;
  icon: string;
  link: string;
}

const shortcuts: Shortcut[] = [
  { name: 'Figma', icon: '/Dock/Figma.webp', link: 'https://www.figma.com' },
  { name: 'Firefly', icon: '/Dock/Firefly.svg.png', link: 'https://www.adobe.com/products/firefly.html' },
  { name: 'Freepik', icon: '/Dock/Freepik.png', link: 'https://www.freepik.com' },
  { name: 'Sesame', icon: '/Dock/Sesame.png', link: 'https://sesame.so' },
  { name: 'Vercel', icon: '/Dock/Vercel.png', link: 'https://vercel.com' },
  { name: 'Wordpress', icon: '/Dock/Wordpress.jpg', link: 'https://wordpress.com' },
  { name: 'Zoho', icon: '/Dock/Zoho.png', link: 'https://www.zoho.com' },
  { 
    name: 'Notion', 
    icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6be92ee5ddf0080fb90_notion.png', 
    link: 'https://www.notion.so'
  },
  { 
    name: 'Webflow', 
    icon: 'https://cdn.prod.website-files.com/6728a6bea73fcc6ee568f6f0_webflow.png', 
    link: 'https://www.webflow.com'
  },
];

const Dock: React.FC = () => {
  const dockRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const isVisible = useRef(false);
  const isTemporarilyHidden = useRef(false); // Track temporary hide on scroll

  // Load visibility from localStorage on mount
  useEffect(() => {
    try {
      const savedVisibility = localStorage.getItem('dockIsVisible');
      if (savedVisibility !== null) {
        const parsedVisibility = JSON.parse(savedVisibility);
        isVisible.current = parsedVisibility;
        if (dockRef.current) {
          gsap.set(dockRef.current, {
            y: parsedVisibility ? 0 : 100,
            opacity: parsedVisibility ? 1 : 0,
          });
        }
      } else {
        // Default to hidden if no saved state
        isVisible.current = false;
        if (dockRef.current) {
          gsap.set(dockRef.current, {
            y: 100,
            opacity: 0,
          });
        }
      }
    } catch {
      // Silently handle error and default to hidden
      isVisible.current = false;
      if (dockRef.current) {
        gsap.set(dockRef.current, {
          y: 100,
          opacity: 0,
        });
      }
    }
  }, []);

  // Handle Cmd + K or Ctrl + K to toggle visibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault();
        isVisible.current = !isVisible.current;
        isTemporarilyHidden.current = false; // Reset temporary hide state
        gsap.to(dockRef.current, {
          y: isVisible.current ? 0 : 100,
          opacity: isVisible.current ? 1 : 0,
          duration: 0.4,
          ease: isVisible.current ? 'power2.out' : 'power2.in',
        });
        try {
          localStorage.setItem('dockIsVisible', JSON.stringify(isVisible.current));
        } catch {
          // Silently handle error
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Handle scroll-based visibility only when isVisible is true
  useEffect(() => {
    const handleScroll = () => {
      if (!isVisible.current) return; // Ignore scroll if permanently hidden

      const currentScrollY = window.scrollY;

      if (currentScrollY > lastScrollY.current && !isTemporarilyHidden.current) {
        // Scroll down: temporarily hide dock
        gsap.to(dockRef.current, {
          y: 100,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
          onComplete: () => {
            isTemporarilyHidden.current = true;
          },
        });
      } else if (currentScrollY < lastScrollY.current && isTemporarilyHidden.current) {
        // Scroll up: show dock
        gsap.to(dockRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
          onComplete: () => {
            isTemporarilyHidden.current = false;
          },
        });
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll);

    // Hover effects for dock items
    const dockItems = document.querySelectorAll(`.${styles.dockItem}`);

    const toggleSiblingClass = (items: NodeList, index: number, offset: number, className: string, add: boolean) => {
      const sibling = items[index + offset] as HTMLElement;
      if (sibling) {
        sibling.classList.toggle(className, add);
      }
    };

    dockItems.forEach((item, index) => {
      item.addEventListener('mouseenter', () => {
        item.classList.add(styles.hover);
        toggleSiblingClass(dockItems, index, -1, styles.siblingClose, true);
        toggleSiblingClass(dockItems, index, 1, styles.siblingClose, true);
        toggleSiblingClass(dockItems, index, -2, styles.siblingFar, true);
        toggleSiblingClass(dockItems, index, 2, styles.siblingFar, true);
      });

      item.addEventListener('mouseleave', () => {
        item.classList.remove(styles.hover);
        toggleSiblingClass(dockItems, index, -1, styles.siblingClose, false);
        toggleSiblingClass(dockItems, index, 1, styles.siblingClose, false);
        toggleSiblingClass(dockItems, index, -2, styles.siblingFar, false);
        toggleSiblingClass(dockItems, index, 2, styles.siblingFar, false);
      });
    });

    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
      dockItems.forEach((item) => {
        item.removeEventListener('mouseenter', () => {});
        item.removeEventListener('mouseleave', () => {});
      });
    };
  }, []);

  return (
    <section ref={dockRef} className={styles.dockContainer}>
      <nav className={styles.dock}>
        <ul className={styles.dockList}>
          {shortcuts.map((shortcut) => (
            <li key={shortcut.name} className={styles.dockItem}>
              <a href={shortcut.link} className={styles.dockItemLink} target="_blank" rel="noopener noreferrer">
                <Image
                  src={shortcut.icon}
                  alt={`${shortcut.name} icon`}
                  width={38}
                  height={38}
                  className={styles.dockItemImage}
                  style={{
                    borderRadius: '5px',
                    objectFit: 'contain',
                    width: '38px',
                    height: '38px',
                  }}
                />
              </a>
              <div className={styles.dockItemTooltip}>{shortcut.name}</div>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
};

export default Dock;