/**
 * Image Utilities
 * Helpers for handling image URLs and fallbacks
 */

/**
 * Validates if a URL is a valid image URL
 * @param url - The URL to validate
 * @returns true if the URL is valid and non-empty
 */
export function isValidImageUrl(url: unknown): boolean {
  if (!url) return false;
  if (typeof url !== 'string') return false;
  
  const trimmedUrl = url.trim();
  if (!trimmedUrl) return false;
  
  // Check if it's a valid URL format
  try {
    new URL(trimmedUrl);
    return true;
  } catch {
    // If it's a relative path like '/empty-image.png', it's still valid
    return trimmedUrl.startsWith('/');
  }
}

/**
 * Gets a safe image URL with fallback
 * @param url - The primary URL
 * @param fallback - The fallback URL (default: '/empty-image.png')
 * @returns A valid image URL or the fallback
 */
export function getSafeImageUrl(url: unknown, fallback: string = '/empty-image.png'): string {
  return isValidImageUrl(url) ? (url as string) : fallback;
}

/**
 * Handles image load errors with retry logic
 * @param event - The error event from Image component
 * @param fallbackUrl - The fallback URL to use
 */
export function handleImageError(
  event: React.SyntheticEvent<HTMLImageElement>,
  fallbackUrl: string = '/empty-image.png'
): void {
  const img = event.currentTarget;
  
  // Prevent infinite loop by checking if already using fallback
  if (img.src === fallbackUrl) {
    return;
  }
  
  img.src = fallbackUrl;
}

/**
 * Optimizes image URL for Next.js Image component
 * Handles Firebase Storage URLs and other CDN URLs
 * @param url - The image URL
 * @returns Optimized URL or fallback
 */
export function optimizeImageUrl(url: unknown): string {
  if (!isValidImageUrl(url)) {
    return '/empty-image.png';
  }
  
  const urlStr = url as string;
  
  // If it's already a relative path, return as-is
  if (urlStr.startsWith('/')) {
    return urlStr;
  }
  
  // For Firebase Storage URLs, they should work as-is
  // Next.js Image component will handle the optimization
  return urlStr;
}
