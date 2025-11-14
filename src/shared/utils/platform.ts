/**
 * Platform detection utility using feature detection (recommended)
 * and user-agent sniffing as fallback.
 *
 * Inspired by apps.apple.com architecture but adapted for React/Next.js
 * with emphasis on feature detection over user-agent parsing.
 */

interface NavigatorLike {
  userAgent: string;
  vendor?: string;
}

interface PlatformDescriptor {
  browser: {
    isSafari: boolean;
    isChrome: boolean;
    isFirefox: boolean;
  };
  device: {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
  };
  features: {
    hasTouch: boolean;
    supportsWebP: boolean;
    supportsBackdropFilter: boolean;
  };
}

class Platform {
  private readonly descriptor: PlatformDescriptor;
  private readonly nav: NavigatorLike;

  constructor(config: {
    descriptor: PlatformDescriptor;
    navigator?: NavigatorLike;
  }) {
    this.descriptor = config.descriptor;
    this.nav = config.navigator || { userAgent: '' };
  }

  /**
   * Detect Safari using feature detection (preferred) with user-agent fallback.
   * Uses multiple strategies for reliability:
   * 1. navigator.vendor check (Apple Computer, Inc.)
   * 2. window.safari object existence
   * 3. User-agent parsing as last resort
   */
  isSafari(): boolean {
    return this.descriptor.browser.isSafari;
  }

  isChrome(): boolean {
    return this.descriptor.browser.isChrome;
  }

  isFirefox(): boolean {
    return this.descriptor.browser.isFirefox;
  }

  isMobile(): boolean {
    return this.descriptor.device.isMobile;
  }

  isTablet(): boolean {
    return this.descriptor.device.isTablet;
  }

  isDesktop(): boolean {
    return this.descriptor.device.isDesktop;
  }

  hasTouch(): boolean {
    return this.descriptor.features.hasTouch;
  }

  supportsWebP(): boolean {
    return this.descriptor.features.supportsWebP;
  }

  supportsBackdropFilter(): boolean {
    return this.descriptor.features.supportsBackdropFilter;
  }

  /**
   * Static factory method to detect platform.
   * SSR-safe: returns a default descriptor on the server.
   */
  static detect(options?: {
    window?: Window;
    navigator?: NavigatorLike;
  }): Platform {
    // SSR fallback
    if (typeof window === 'undefined') {
      return new Platform({
        descriptor: {
          browser: { isSafari: false, isChrome: false, isFirefox: false },
          device: { isMobile: false, isTablet: false, isDesktop: true },
          features: { hasTouch: false, supportsWebP: false, supportsBackdropFilter: false },
        },
      });
    }

    const nav = options?.navigator ?? window.navigator;
    const win = options?.window ?? window;

    return new Platform({
      descriptor: detectDescriptor({ window: win, navigator: nav }),
      navigator: nav,
    });
  }
}

/**
 * Detect platform descriptor using feature detection.
 */
function detectDescriptor(options: {
  window: Window;
  navigator: NavigatorLike;
}): PlatformDescriptor {
  const { window: win, navigator: nav } = options;
  const ua = nav.userAgent || '';

  // --- BROWSER DETECTION (Feature Detection First) ---

  // Safari: Multiple strategies
  const isSafariByVendor = nav.vendor?.includes('Apple') || false;
  const isSafariByWindow = 'safari' in win && 'pushNotification' in (win as any).safari;
  const isSafariByUA = /^((?!chrome|android).)*safari/i.test(ua);
  const isSafari = isSafariByVendor || isSafariByWindow || isSafariByUA;

  // Chrome
  const isChromeByUA = /chrome/i.test(ua);
  const isChromeByVendor = nav.vendor?.includes('Google') || false;
  const isChrome = (isChromeByUA || isChromeByVendor) && !isSafari;

  // Firefox
  const isFirefox = /firefox/i.test(ua);

  // --- DEVICE DETECTION ---

  const isMobile = /mobile/i.test(ua) ||
    ('maxTouchPoints' in nav && (nav as any).maxTouchPoints > 1 && /MacIntel/.test(ua)); // iPad fix

  const isTablet = /tablet|ipad/i.test(ua) ||
    (isMobile && Math.min(win.screen.width, win.screen.height) >= 768);

  const isDesktop = !isMobile && !isTablet;

  // --- FEATURE DETECTION ---

  const hasTouch = 'ontouchstart' in win ||
    ('maxTouchPoints' in nav && (nav as any).maxTouchPoints > 0);

  // Check WebP support
  const supportsWebP = (() => {
    const canvas = win.document.createElement('canvas');
    if (canvas.getContext && canvas.getContext('2d')) {
      return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  })();

  // Check backdrop-filter support (WebKit feature)
  const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)') ||
    CSS.supports('-webkit-backdrop-filter', 'blur(10px)');

  return {
    browser: {
      isSafari,
      isChrome,
      isFirefox,
    },
    device: {
      isMobile,
      isTablet,
      isDesktop,
    },
    features: {
      hasTouch,
      supportsWebP,
      supportsBackdropFilter,
    },
  };
}

// Create a singleton instance
const platform = Platform.detect();

export default platform;
