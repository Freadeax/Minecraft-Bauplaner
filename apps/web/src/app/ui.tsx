export const REPO_URL = 'https://github.com/Freadeax/Minecraft-Bauplaner';

export function Cube({ small = false }: { small?: boolean }) {
  return <svg width={small ? 18 : 30} height={small ? 18 : 30} viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="m16 3 12 7v13l-12 7-12-7V10zM4 10l12 7 12-7M16 17v13" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
}

/** Triggers a browser download of local data; nothing is uploaded. */
export function download(name: string, data: BlobPart, type = 'application/octet-stream'): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const formatNumber = (n: number): string => n.toLocaleString('de-DE');

export function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}
