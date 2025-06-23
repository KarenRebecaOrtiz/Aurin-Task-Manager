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
import styles from './Cursor.module.scss';

interface CursorContextType {
  cursorPos: { x: number; y: number };
  isActive: boolean;
  cursorRef: React.RefObject<HTMLDivElement | null>;
  isCursorEnabled: boolean;
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
  const [isCursorEnabled, setIsCursorEnabled] = React.useState(true);
  const cursorRef = React.useRef<HTMLDivElement>(null);

  // Load cursor visibility from localStorage on mount
  React.useEffect(() => {
    try {
      const savedVisibility = localStorage.getItem('cursorIsEnabled');
      if (savedVisibility !== null) {
        const parsedVisibility = JSON.parse(savedVisibility);
        setIsCursorEnabled(parsedVisibility);
        console.log('[CursorProvider] Loaded cursor visibility from localStorage:', parsedVisibility);
      }
    } catch (error) {
      console.error('[CursorProvider] Error loading cursor visibility from localStorage:', error);
    }
  }, []);

  // Save cursor visibility to localStorage whenever it changes
  React.useEffect(() => {
    try {
      localStorage.setItem('cursorIsEnabled', JSON.stringify(isCursorEnabled));
      console.log('[CursorProvider] Saved cursor visibility to localStorage:', isCursorEnabled);
    } catch (error) {
      console.error('[CursorProvider] Error saving cursor visibility to localStorage:', error);
    }
  }, [isCursorEnabled]);

  // Handle Cmd+Shift+L or Ctrl+Shift+L to toggle cursor
  React.useEffect(() => {
    console.log('[CursorProvider] Registering keydown listener for Cmd+Shift+L/Ctrl+Shift+L');
    const isHTMLElement = (target: EventTarget): target is HTMLElement => {
      return target instanceof HTMLElement;
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      console.log('[CursorProvider] Keydown detected:', {
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        key: event.key,
        target: isHTMLElement(event.target) ? event.target.tagName : 'Unknown',
        targetId: isHTMLElement(event.target) ? event.target.id : 'Unknown',
        targetClass: isHTMLElement(event.target) ? event.target.className : 'Unknown',
        defaultPrevented: event.defaultPrevented,
      });
      if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        console.log('[CursorProvider] Cmd/Ctrl+Shift+L pressed, toggling cursor. Current state:', isCursorEnabled);
        setIsCursorEnabled((prev) => {
          const newState = !prev;
          console.log('[CursorProvider] New cursor state:', newState);
          return newState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown, { capture: true });
    return () => {
      console.log('[CursorProvider] Cleaning up keydown listener');
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [isCursorEnabled]);

  // Handle mouse movement and visibility
  React.useEffect(() => {
    const parent = document.body;
    console.log('[CursorProvider] Setting up mouse listeners on body');

    if (getComputedStyle(parent).position === 'static') {
      parent.style.position = 'relative';
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (!isCursorEnabled) return;
      const rect = parent.getBoundingClientRect();
      setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
      setIsActive(true);
    };
    const handleMouseLeave = () => {
      if (!isCursorEnabled) return;
      setIsActive(false);
    };

    parent.addEventListener('mousemove', handleMouseMove);
    parent.addEventListener('mouseleave', handleMouseLeave);

    parent.style.cursor = isCursorEnabled && isActive ? 'none' : 'default';
    console.log('[CursorProvider] Cursor style set to:', parent.style.cursor);

    return () => {
      console.log('[CursorProvider] Cleaning up mouse listeners');
      parent.removeEventListener('mousemove', handleMouseMove);
      parent.removeEventListener('mouseleave', handleMouseLeave);
      parent.style.cursor = 'default';
    };
  }, [isCursorEnabled, isActive]);

  return (
    <CursorContext.Provider value={{ cursorPos, isActive, cursorRef, isCursorEnabled }}>
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
    console.log('[Cursor] Updating cursor position:', { x: cursorPos.x, y: cursorPos.y, isActive, isCursorEnabled });
    x.set(cursorPos.x);
    y.set(cursorPos.y);
  }, [cursorPos, x, y, isActive, isCursorEnabled]);

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
  children: React.ReactNode;
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
  const { cursorPos, isActive, cursorRef, isCursorEnabled } = useCursor();
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
    console.log('[CursorFollow] Updating follower position:', { x: cursorPos.x, y: cursorPos.y, isActive, isCursorEnabled });
    const offset = calculateOffset();
    const cursorRect = cursorRef.current?.getBoundingClientRect();
    const cursorWidth = cursorRect?.width ?? 20;
    const cursorHeight = cursorRect?.height ?? 20;

    x.set(cursorPos.x - offset.x + cursorWidth / 2);
    y.set(cursorPos.y - offset.y + cursorHeight / 2);
  }, [calculateOffset, cursorPos, cursorRef, x, y, isActive, isCursorEnabled]);

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
          {children}
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