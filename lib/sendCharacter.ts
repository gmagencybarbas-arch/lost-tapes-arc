import { TERMS_VERSION } from './legal';

export type SendProgress = {
  phase: 'transmit' | 'confirm';
  progress: number | null;
};

export type CharacterPayload = {
  file: File;
  characterName: string;
  socialNetwork: 'instagram' | 'tiktok';
  handle: string;
  accepted: boolean;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseUploadResponse(status: number, raw: string): { fileName: string } {
  let data: unknown = null;
  try {
    data = JSON.parse(raw);
  } catch {
    data = null;
  }

  if (isRecord(data) && data.ok === true && typeof data.fileName === 'string') {
    return { fileName: data.fileName };
  }

  if (isRecord(data) && data.ok === false && typeof data.error === 'string' && data.error.trim()) {
    throw new Error(data.error.slice(0, 240));
  }

  if (status === 413) {
    throw new Error('O servidor recusou o tamanho deste arquivo. O personagem não foi confirmado.');
  }

  throw new Error('Não houve confirmação do recebimento. O personagem não foi marcado como enviado.');
}

export function sendCharacter(
  payload: CharacterPayload,
  onProgress: (update: SendProgress) => void,
): Promise<{ fileName: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('byteSize', String(payload.file.size));
    form.append('characterName', payload.characterName);
    form.append('socialNetwork', payload.socialNetwork);
    form.append('handle', payload.handle);
    form.append('accepted', payload.accepted ? 'true' : 'false');
    form.append('termsVersion', TERMS_VERSION);
    form.append('file', payload.file);

    xhr.open('POST', '/api/upload');
    xhr.setRequestHeader('X-Arquivo-Request', '1');
    xhr.timeout = 70_000;

    let movedToConfirm = false;
    const confirm = () => {
      if (movedToConfirm) return;
      movedToConfirm = true;
      onProgress({ phase: 'confirm', progress: null });
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      onProgress({ phase: 'transmit', progress: event.loaded / event.total });
      if (event.loaded >= event.total) confirm();
    };
    xhr.upload.onload = () => confirm();
    xhr.onerror = () => {
      reject(new Error('A conexão caiu antes da confirmação. O personagem não foi marcado como enviado.'));
    };
    xhr.ontimeout = () => {
      reject(new Error('A confirmação não chegou a tempo. Confira a pasta antes de reenviar.'));
    };
    xhr.onload = () => {
      confirm();
      void (async () => {
        try {
          const result = parseUploadResponse(xhr.status, xhr.responseText);
          const confirmed = await fetch('/api/receipt', { cache: 'no-store' });
          const receipt = (await confirmed.json().catch(() => null)) as { ok?: boolean } | null;
          if (!confirmed.ok || !receipt?.ok) {
            throw new Error(
              'O personagem foi recebido, mas o navegador não abriu a confirmação. Evite reenviar até conferir a pasta.',
            );
          }
          resolve(result);
        } catch (error) {
          reject(error instanceof Error ? error : new Error('Não houve confirmação do recebimento.'));
        }
      })();
    };

    xhr.send(form);
  });
}
