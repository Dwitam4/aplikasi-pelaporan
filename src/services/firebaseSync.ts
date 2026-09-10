import { ReportDocument, MasterPresets, UnassignedPassenger } from '../types';

type Listener<T> = (value: T) => void;
const request = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...init });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  const body = await response.json();
  return body.data as T;
};
const subscribe = <T>(url: string, onUpdate: Listener<T>, onError?: (error: Error) => void) => {
  let closed = false;
  request<T>(url).then(value => { if (!closed) onUpdate(value); }).catch(err => onError?.(err));
  const source = new EventSource('/api/reports/stream');
  source.onmessage = event => {
    try {
      const message = JSON.parse(event.data);
      if (url === '/api/reports' && (message.type === 'INIT' || message.type === 'SYNC_ALL')) onUpdate(message.payload);
      if (url === '/api/presets' && message.type === 'UPDATE_PRESETS') onUpdate(message.payload);
      if (url === '/api/unassigned' && message.type === 'UPDATE_UNASSIGNED') onUpdate(message.payload);
      if (url === '/api/reports' && message.type === 'UPDATE_REPORT') request<T>(url).then(onUpdate);
      if (url === '/api/reports' && message.type === 'DELETE_REPORT') request<T>(url).then(onUpdate);
    } catch (err) { onError?.(err as Error); }
  };
  source.onerror = () => { /* the initial HTTP read remains available offline */ };
  return () => { closed = true; source.close(); };
};
export const subscribeToReports = (onUpdate: Listener<ReportDocument[]>, onError?: (error: Error) => void) => subscribe('/api/reports', onUpdate, onError);
export const subscribeToMasterPresets = (onUpdate: Listener<MasterPresets>, onError?: (error: Error) => void) => subscribe('/api/presets', onUpdate, onError);
export const subscribeToUnassignedPassengers = (onUpdate: Listener<UnassignedPassenger[]>, onError?: (error: Error) => void) => subscribe('/api/unassigned', onUpdate, onError);
export const saveReportToDatabase = (report: ReportDocument) => request<ReportDocument>(`/api/reports/${encodeURIComponent(report.id)}`, { method: 'PUT', body: JSON.stringify(report) }).then(() => undefined);
export const deleteReportFromDatabase = (reportId: string) => request(`/api/reports/${encodeURIComponent(reportId)}`, { method: 'DELETE' }).then(() => undefined);
export const saveMasterPresetsToDatabase = (presets: MasterPresets) => request<MasterPresets>('/api/presets', { method: 'PUT', body: JSON.stringify(presets) }).then(() => undefined);
export const saveUnassignedPassengersToDatabase = (passengers: UnassignedPassenger[]) => request<UnassignedPassenger[]>('/api/unassigned', { method: 'PUT', body: JSON.stringify(passengers) }).then(() => undefined);
export const seedInitialDatabaseIfEmpty = async (initialDoc: ReportDocument, initialPresets: MasterPresets) => {
  const [reports, presets] = await Promise.all([request<ReportDocument[]>('/api/reports'), request<MasterPresets | null>('/api/presets')]);
  if (!presets) await saveMasterPresetsToDatabase(initialPresets);
  if (!reports.length) await saveReportToDatabase(initialDoc);
};
