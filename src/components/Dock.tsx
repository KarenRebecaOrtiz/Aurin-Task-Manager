import React, { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import styles from './Dock.module.scss';

interface Shortcut {
  name: string;
  icon: string;
  link: string;
}

const shortcuts: Shortcut[] = [
  { name: 'Notion', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6be92ee5ddf0080fb90_notion.png', link: 'https://www.notion.so' },
  { name: 'Asana', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6bef9d004f8a9cf3b29_asana.png', link: 'https://www.asana.com' },
  { name: 'Slack', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6be8c099d4e1ed55770_slack.png', link: 'https://www.slack.com' },
  { name: 'Loom', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6be5b31ba243e4da377_loom.png', link: 'https://www.loom.com' },
  { name: 'Spotify', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6bea97e140677496dae_spotify.png', link: 'https://www.spotify.com' },
  { name: 'Webflow', icon: 'https://cdn.prod.website-files.com/6728a3e6f4f4161c235bc519/6728a6bea73fcc6ee568f6f0_webflow.png', link: 'https://www.webflow.com' },
];

const Dock: React.FC = () => {
  const dockRef = useRef<HTMLElement>(null);
  const lastScrollY = useRef(0);
  const [isDockVisible, setIsDockVisible] = useState(true); // State for dock visibility

  useEffect(() => {
    // Initial animation: slide in from above if visible
    if (isDockVisible && dockRef.current) {
      gsap.fromTo(
        dockRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: 'power3.out' }
      );
    }

    // Keyboard shortcut handler for Cmd+K or Ctrl+K
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault(); // Prevent browser defaults (e.g., search bar)
        setIsDockVisible((prev) => {
          const newVisibility = !prev;
          if (dockRef.current) {
            if (newVisibility) {
              // Show dock
              gsap.to(dockRef.current, {
                y: 0,
                opacity: 1,
                duration: 0.4,
                ease: 'power2.out',
              });
            } else {
              // Hide dock
              gsap.to(dockRef.current, {
                y: 100,
                opacity: 0,
                duration: 0.4,
                ease: 'power2.in',
              });
            }
          }
          return newVisibility;
        });
      }
    };

    // Scroll handler (only active when dock is visible)
    const handleScroll = () => {
      if (!isDockVisible) return; // Skip if dock is permanently hidden
      const currentScrollY = window.scrollY;
      const isCurrentlyVisible = dockRef.current?.style.opacity !== '0';

      if (currentScrollY > lastScrollY.current && isCurrentlyVisible) {
        // Scroll down: hide dock
        gsap.to(dockRef.current, {
          y: 100,
          opacity: 0,
          duration: 0.4,
          ease: 'power2.in',
        });
      } else if (currentScrollY < lastScrollY.current && !isCurrentlyVisible) {
        // Scroll up: show dock
        gsap.to(dockRef.current, {
          y: 0,
          opacity: 1,
          duration: 0.4,
          ease: 'power2.out',
        });
      }

      lastScrollY.current = currentScrollY;
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
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
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll);
      dockItems.forEach((item) => {
        item.removeEventListener('mouseenter', () => {});
        item.removeEventListener('mouseleave', () => {});
      });
    };
  }, [isDockVisible]); // Re-run effect when isDockVisible changes

  // Conditionally render dock based on visibility
  if (!isDockVisible && dockRef.current?.style.opacity === '0') {
    return null; // Don't render if hidden
  }

  return (
    <section ref={dockRef} className={styles.dockContainer}>
      <nav className={styles.dock}>
        <ul className={styles.dockList}>
          {shortcuts.map((shortcut) => (
            <li key={shortcut.name} className={styles.dockItem}>
              <a href={shortcut.link} className={styles.dockItemLink} target="_blank" rel="noopener noreferrer">
                <img src={shortcut.icon} alt={`${shortcut.name} icon`} className={styles.dockItemImage} />
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