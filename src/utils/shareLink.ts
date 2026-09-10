import { ReportDocument } from '../types';

/**
 * Encode a report document into a URL-safe base64 string
 */
export function encodeReportPayload(report: ReportDocument): string {
  try {
    const jsonStr = JSON.stringify(report);
    // Encode UTF-8 safely
    const utf8Bytes = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (_, p1) => {
      return String.fromCharCode(parseInt(p1, 16));
    });
    return btoa(utf8Bytes);
  } catch (e) {
    console.error('Failed to encode report payload', e);
    return '';
  }
}

/**
 * Decode a URL-safe base64 string back into a ReportDocument
 */
export function decodeReportPayload(encoded: string): ReportDocument | null {
  try {
    const binary = atob(encoded);
    const jsonStr = decodeURIComponent(
      Array.prototype.map
        .call(binary, (c: string) => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    const parsed = JSON.parse(jsonStr);
    if (parsed && parsed.id && Array.isArray(parsed.rows)) {
      return parsed as ReportDocument;
    }
  } catch (e) {
    console.warn('Failed to decode report payload', e);
  }
  return null;
}

/**
 * Generate full shareable link for a specific driver
 */
export function generateDriverShareUrl(report: ReportDocument): string {
  const origin = window.location.origin;
  const pathname = window.location.pathname;
  const payload = encodeReportPayload(report);
  
  const url = new URL(pathname, origin);
  url.searchParams.set('role', 'driver');
  url.searchParams.set('reportId', report.id);
  if (payload) {
    url.searchParams.set('data', payload);
  }
  return url.toString();
}
