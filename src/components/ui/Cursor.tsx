"use client";

import * as React from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  AnimatePresence,
  type HTMLMotionProps,
  type Transition,
} from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import styles from './Cursor.module.scss';

interface CursorContextType {
  cursorPos: { x: number; y: number };
  isActive: boolean;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  isCursorEnabled: boolean;
  userFirstName: string;
}

const CursorContext = React.createContext<CursorContextType | undefined>(undefined);

const useCursor = (): CursorContextType => {
  const context = React.useContext(CursorContext);
  if (!context) {
    throw new Error('useCursor must be used within a CursorProvider');
  }
  return context;
};

// Props for CursorProvider
interface CursorProviderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// CursorProvider component
const CursorProvider: React.FC<CursorProviderProps> = ({ children, ...props }) => {
  const [cursorPos, setCursorPos] = React.useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = React.useState(false);
  const [isCursorEnabled, setIsCursorEnabled] = React.useState(false);
  const [isTouchDevice, setIsTouchDevice] = React.useState(false);
  const [userFirstName, setUserFirstName] = React.useState('');
  const cursorRef = React.useRef<HTMLDivElement>(null);
  const { user } = useUser();

  // Fetch user's first name from Firestore
  React.useEffect(() => {
    if (!user?.id) {
      setUserFirstName('');
      return;
    }

    const userDocRef = doc(db, 'users', user.id);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const displayName = data.displayName || '';
        // Extract first name from displayName
        const firstName = displayName.split(' ')[0] || '';
        setUserFirstName(firstName);
      } else {
        setUserFirstName('');
      }
    }, (error) => {
      console.error('Error listening to user data:', error);
      setUserFirstName('');
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Detect touch device on mount
  React.useEffect(() => {
    const detectTouchDevice = () => {
      // Check for touch support - most reliable method
      const hasTouchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      // Check for pointer events with touch capability (coarse pointer = touch/finger)
      const hasPointerTouch = window.matchMedia('(pointer: coarse)').matches;
      
      // Check for hover capability (touch devices typically don't have hover)
      const hasHoverSupport = window.matchMedia('(hover: hover)').matches;
      
      // More specific touch detection - only disable if device has touch AND lacks hover
      // This ensures laptops with touch screens still get cursor functionality
      const isTouchOnly = hasTouchSupport && !hasHoverSupport;
      
      // Alternative: use pointer: coarse which specifically indicates touch/finger input
      const isTouchDevice = hasPointerTouch || isTouchOnly;
      
      setIsTouchDevice(isTouchDevice);
      
      // Automatically disable cursor only on touch-only devices
      if (isTouchDevice) {
        setIsCursorEnabled(false);
      }
    };

    detectTouchDevice();
    
    // Re-detect on resize (in case of device rotation or window changes)
    window.addEventListener('resize', detectTouchDevice);
    return () => window.removeEventListener('resize', detectTouchDevice);
  }, []);

  // Load cursor visibility from localStorage on mount (only for non-touch devices)
  React.useEffect(() => {
    if (isTouchDevice) {
      return;
    }
    
    try {
      const savedVisibility = localStorage.getItem('cursorIsEnabled');
      if (savedVisibility !== null) {
        const parsedVisibility = JSON.parse(savedVisibility);
        setIsCursorEnabled(parsedVisibility);
      } else {
        // Default to disabled if no saved state
        setIsCursorEnabled(false);
      }
    } catch {
      // Silent error handling - default to disabled
      setIsCursorEnabled(false);
    }
  }, [isTouchDevice]);

  // Save cursor visibility to localStorage whenever it changes (only for non-touch devices)
  React.useEffect(() => {
    if (isTouchDevice) {
      return;
    }
    
    try {
      localStorage.setItem('cursorIsEnabled', JSON.stringify(isCursorEnabled));
    } catch {
      // Silent error handling
    }
  }, [isCursorEnabled, isTouchDevice]);

  // Handle Cmd+Shift+L or Ctrl+Shift+L to toggle cursor (only for non-touch devices)
  React.useEffect(() => {
    if (isTouchDevice) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setIsCursorEnabled((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isCursorEnabled, isTouchDevice]);

  // Handle mouse movement and visibility (only for non-touch devices)
  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isCursorEnabled || isTouchDevice) return;
    const parent = document.body;
    const rect = parent.getBoundingClientRect();
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    setIsActive(true);
  }, [isCursorEnabled, isTouchDevice]);

  const handleMouseLeave = React.useCallback(() => {
    if (!isCursorEnabled || isTouchDevice) return;
    setIsActive(false);
  }, [isCursorEnabled, isTouchDevice]);

  React.useEffect(() => {
    if (isTouchDevice) {
      return;
    }
    
    const parent = document.body;

    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    // Update cursor style based on current state
    const updateCursorStyle = () => {
      parent.style.cursor = isCursorEnabled ? 'none' : 'default';
    };
    updateCursorStyle();

    return () => {
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      parent.style.cursor = 'default';
    };
  }, [isCursorEnabled, isTouchDevice, handleMouseMove, handleMouseLeave]);

  // Handle cursor style updates when isActive changes
  React.useEffect(() => {
    if (isTouchDevice) {
      return;
    }
    
    const parent = document.body;
    parent.style.cursor = isCursorEnabled && isActive ? 'none' : 'default';
  }, [isActive, isCursorEnabled, isTouchDevice]);

  return (
    <CursorContext.Provider value={{ cursorPos, isActive, cursorRef, isCursorEnabled: isCursorEnabled && !isTouchDevice, userFirstName }}>
      <div data-slot="cursor-provider" {...props}>
        {children}
      </div>
    </CursorContext.Provider>
  );
};

// Props for Cursor
interface CursorProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
}

// Cursor component
const Cursor: React.FC<CursorProps> = ({ children, className, style, ...props }) => {
  const { cursorPos, isActive, cursorRef, isCursorEnabled } = useCursor();

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  React.useEffect(() => {
    x.set(cursorPos.x);
    y.set(cursorPos.y);
  }, [cursorPos.x, cursorPos.y, x, y]);

  return (
    <AnimatePresence>
      {isActive && isCursorEnabled && (
        <motion.div
          ref={cursorRef}
          data-slot="cursor"
          className={`${styles.cursor} ${className || ''}`}
          style={{ top: y, left: x, ...style }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          {...props}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Alignment options for CursorFollow
type Align =
  | 'top'
  | 'top-left'
  | 'top-right'
  | 'bottom'
  | 'bottom-left'
  | 'bottom-right'
  | 'left'
  | 'right'
  | 'center';

// Props for CursorFollow
interface CursorFollowProps extends HTMLMotionProps<'div'> {
  sideOffset?: number;
  align?: Align;
  transition?: Transition;
  children?: React.ReactNode;
}

// CursorFollow component
const CursorFollow: React.FC<CursorFollowProps> = ({
  sideOffset = 15,
  align = 'bottom-right',
  children,
  className,
  style,
  transition = { type: 'spring', stiffness: 500, damping: 50, bounce: 0 },
  ...props
}) => {
  const { cursorPos, isActive, cursorRef, isCursorEnabled, userFirstName } = useCursor();
  const cursorFollowRef = React.useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, transition);
  const springY = useSpring(y, transition);

  const calculateOffset = React.useCallback(() => {
    const rect = cursorFollowRef.current?.getBoundingClientRect();
    const width = rect?.width ?? 0;
    const height = rect?.height ?? 0;

    let newOffset: { x: number; y: number };

    switch (align) {
      case 'center':
        newOffset = { x: width / 2, y: height / 2 };
        break;
      case 'top':
        newOffset = { x: width / 2, y: height + sideOffset };
        break;
      case 'top-left':
        newOffset = { x: width + sideOffset, y: height + sideOffset };
        break;
      case 'top-right':
        newOffset = { x: -sideOffset, y: height + sideOffset };
        break;
      case 'bottom':
        newOffset = { x: width / 2, y: -sideOffset };
        break;
      case 'bottom-left':
        newOffset = { x: width + sideOffset, y: -sideOffset };
        break;
      case 'bottom-right':
        newOffset = { x: -sideOffset, y: -sideOffset };
        break;
      case 'left':
        newOffset = { x: width + sideOffset, y: height / 2 };
        break;
      case 'right':
        newOffset = { x: -sideOffset, y: height / 2 };
        break;
      default:
        newOffset = { x: 0, y: 0 };
    }

    return newOffset;
  }, [align, sideOffset]);

  React.useEffect(() => {
    const offset = calculateOffset();
    const cursorRect = cursorRef.current?.getBoundingClientRect();
    const cursorWidth = cursorRect?.width ?? 20;
    const cursorHeight = cursorRect?.height ?? 20;

    x.set(cursorPos.x - offset.x + cursorWidth / 2);
    y.set(cursorPos.y - offset.y + cursorHeight / 2);
  }, [cursorPos.x, cursorPos.y, calculateOffset, x, y, cursorRef]);

  return (
    <AnimatePresence>
      {isActive && isCursorEnabled && (
        <motion.div
          ref={cursorFollowRef}
          data-slot="cursor-follow"
          className={`${styles.cursorFollow} ${className || ''}`}
          style={{ top: springY, left: springX, ...style }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          {...props}
        >
          {children || (
            <div className={styles.cursorFollowContent}>
              {userFirstName || 'Usuario'}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// Demo component to showcase the cursor
const CursorDemo: React.FC = () => {
  return (
    <div className={styles.demoContainer}>
      <p className={styles.demoText}>Move your mouse over the div</p>
      <CursorProvider>
        <Cursor>
          <svg
            className={styles.cursorIcon}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 40 40"
          >
            <path
              fill="currentColor"
              d="M1.8 4.4 7 36.2c.3 1.8 2.6 2.3 3.6.8l3.9-5.7c1.7-2.5 4.5-4.1 7.5-4.3l6.9-.5c1.8-.1 2.5-2.4 1.1-3.5L5 2.5c-1.4-1.1-3.5 0-3.3 1.9Z"
            />
          </svg>
        </Cursor>
        <CursorFollow>
          <div className={styles.cursorFollowContent}>Designer</div>
        </CursorFollow>
      </CursorProvider>
    </div>
  );
};

export { CursorProvider, Cursor, CursorFollow, useCursor, CursorDemo };
export type { CursorContextType, CursorProviderProps, CursorProps, CursorFollowProps };