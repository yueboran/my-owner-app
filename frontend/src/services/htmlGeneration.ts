export type SourceType = 'journal' | 'knowledge-collector' | 'business-analysis' | 'biography';
export interface ModelChoice { id: string; name: string; variants: string[] }
export interface Catalog { providers: { id: string; name: string; default?: string; models: ModelChoice[] }[]; themes: { id: string; name: string }[] }
export interface GenerationJob { id: string; title: string; status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'; stage: string; error?: string; created_at: number; model_id: string; theme: string }
const base = ((import.meta as ImportMeta & { env?: { VITE_API_BASE_URL?: string } }).env?.VITE_API_BASE_URL ?? '/api') + '/html-generation';
export async function generationApi<T>(path: string, options: RequestInit = {}, html = false): Promise<T> {
  let clientId = localStorage.getItem('stars:html-client');
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem('stars:html-client', clientId);
  }
  const response = await fetch(base + path, { ...options, headers: { 'Content-Type': 'application/json', 'X-HTML-Client': clientId, ...options.headers } });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(typeof error.detail === 'string' ? error.detail : `请求失败（${response.status}）`);
  }
  return (html ? await response.text() : await response.json()) as T;
}
export function sourceSnapshot(source: unknown): string {
  const omitted = new Set(['attachments', 'thumbnail', 'url', 'avatar', 'avatarUrl', 'createdAt', 'updatedAt', 'aiReflection', 'aiSummary']);
  return JSON.stringify(source, (key, value) => omitted.has(key) || (typeof value === 'string' && value.startsWith('data:')) ? undefined : value, 2);
}
export const busyJob = (job: GenerationJob | null) => !!job && (job.status === 'queued' || job.status === 'running');
