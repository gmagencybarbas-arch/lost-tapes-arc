export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

const BROWSER_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);

export type ImageMime = 'image/png' | 'image/jpeg' | 'image/webp';

export function validateClientFile(file: { size: number; type: string; name: string }): string | null {
  if (file.size <= 0) return 'O arquivo está vazio.';
  if (file.size > MAX_UPLOAD_BYTES) return 'A imagem passa de 10 MB. Escolha um arquivo menor.';

  const type = file.type.toLowerCase();
  if (type && !BROWSER_TYPES.has(type)) {
    return 'Esse formato não entra no arquivo. Use PNG, JPG ou WEBP.';
  }

  if (!type && !/\.(png|jpe?g|webp)$/i.test(file.name)) {
    return 'Esse formato não entra no arquivo. Use PNG, JPG ou WEBP.';
  }

  return null;
}

export function inspectImage(bytes: Uint8Array): ImageMime | null {
  if (bytes.length < 12 || bytes.length > MAX_UPLOAD_BYTES) return null;

  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export function sanitizeOriginalName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? 'imagem';
  const cleaned = base
    .replace(/[\u0000-\u001F\u007F]/g, '')
    .replace(/[^\p{L}\p{N}.\- ()@_]/gu, '')
    .trim()
    .slice(0, 120);
  return cleaned || 'imagem';
}

export function isDriveId(value: string): boolean {
  return /^[a-zA-Z0-9_-]{10,128}$/.test(value);
}

export function isSafeFileName(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= 180 &&
    !value.includes('..') &&
    !/[\u0000-\u001F\u007F/\\]/.test(value)
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1).replace('.', ',')} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`;
}
