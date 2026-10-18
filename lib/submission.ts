import { TERMS_VERSION } from './legal';

export type SocialNetwork = 'instagram' | 'tiktok';

export type SubmissionFields = {
  characterName: string;
  socialNetwork: SocialNetwork;
  handle: string;
  accepted: boolean;
  termsVersion: string;
};

const HANDLE = /^@?[A-Za-z0-9._]{2,40}$/;

export function cleanLine(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (text.length > max) return null;
  return text;
}

export function normalizeHandle(value: string): string | null {
  const compact = value.replace(/\s+/g, '');
  if (!HANDLE.test(compact)) return null;
  return compact.startsWith('@') ? compact : `@${compact}`;
}

export function validateSubmissionFields(input: {
  characterName: unknown;
  socialNetwork: unknown;
  handle: unknown;
  accepted: unknown;
  termsVersion: unknown;
}): { ok: true; value: SubmissionFields } | { ok: false; error: string } {
  const characterName = cleanLine(input.characterName, 48);
  if (!characterName || characterName.length < 2) {
    return { ok: false, error: 'Informe o nome do personagem.' };
  }

  if (input.socialNetwork !== 'instagram' && input.socialNetwork !== 'tiktok') {
    return { ok: false, error: 'Escolha TikTok ou Instagram.' };
  }

  const handleSource = cleanLine(input.handle, 41);
  const handle = handleSource ? normalizeHandle(handleSource) : null;
  if (!handle) return { ok: false, error: 'Informe o @ do criador.' };

  if (input.accepted !== true && input.accepted !== 'true') {
    return { ok: false, error: 'Aceite a autorização de uso para enviar o personagem.' };
  }

  if (input.termsVersion !== TERMS_VERSION) {
    return { ok: false, error: 'A versão dos termos não confere. Leia a autorização de novo.' };
  }

  return {
    ok: true,
    value: {
      characterName,
      socialNetwork: input.socialNetwork,
      handle,
      accepted: true,
      termsVersion: TERMS_VERSION,
    },
  };
}

export function isSubmissionId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
