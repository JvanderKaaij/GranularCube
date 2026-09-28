/** The phone uses the same server as its page; the desktop dev server uses port 8000. */
function origin(): string {
  if (typeof window === 'undefined') return 'http://localhost:8000';
  const page = new URL(window.location.href);
  if (page.port === '5173') page.port = '8000';
  return page.origin;
}
export const API_ORIGIN = origin();
export const apiUrl = (path: string): string => `${API_ORIGIN}${path}`;
export const fallbackApiUrl = (path: string): string => apiUrl(path).replace('://localhost:', '://127.0.0.1:');
