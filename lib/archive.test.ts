import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { credentialsMatch, signAdminSession, verifyAdminSession } from './adminAuth';
import { GAS_ERROR_MESSAGES, interpretCountBody, interpretGasBody, postToAppsScript } from './appsScript';
import { assertAppsScriptUrl } from './config';
import {
  formatBytes,
  inspectImage,
  isSafeFileName,
  MAX_UPLOAD_BYTES,
  sanitizeOriginalName,
  validateClientFile,
} from './files';
import { beginSubmission } from './guard';
import { TERMS_TEXT, TERMS_VERSION } from './legal';
import { signReceipt, verifyReceipt } from './receipt';
import { DEFAULT_SETTINGS, parseSettings } from './siteSettings';
import { validateSubmissionFields } from './submission';

const root = process.cwd();
const secret = '12345678901234567890123456789012';
const fileId = '1AbCdEfGhIjKlMn';
const metadataFileId = '1ZyXwVuTsRqPoNm';
const submissionId = '123e4567-e89b-42d3-a456-426614174000';

function listen(server: Server): Promise<number> {
  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve((server.address() as AddressInfo).port);
    });
  });
}

describe('imagens', () => {
  it('reconhece PNG, JPEG e WEBP pelos bytes', () => {
    const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const webp = Uint8Array.from([
      0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
    ]);
    const text = Uint8Array.from(Array.from('hello world!!').map((char) => char.charCodeAt(0)));

    assert.equal(inspectImage(png), 'image/png');
    assert.equal(inspectImage(jpeg), 'image/jpeg');
    assert.equal(inspectImage(webp), 'image/webp');
    assert.equal(inspectImage(text), null);
  });

  it('recusa tipo e tamanho no navegador antes do envio', () => {
    assert.equal(validateClientFile({ size: 100, type: 'image/png', name: 'a.png' }), null);
    assert.match(validateClientFile({ size: MAX_UPLOAD_BYTES + 1, type: 'image/png', name: 'a.png' }) ?? '', /10 MB/);
    assert.match(validateClientFile({ size: 20, type: 'image/gif', name: 'a.gif' }) ?? '', /PNG, JPG ou WEBP/);
    assert.equal(validateClientFile({ size: 20, type: '', name: 'a.webp' }), null);
  });

  it('formata tamanho e limpa o nome original', () => {
    assert.equal(formatBytes(1536), '1,5 KB');
    assert.equal(sanitizeOriginalName('../José arte.png'), 'José arte.png');
    assert.equal(isSafeFileName('../segredo.png'), false);
  });
});

describe('recibo', () => {
  it('só aceita um recibo assinado e dentro do prazo', () => {
    const claims = {
      fileName: `${submissionId}.png`,
      fileId,
      submissionId,
      characterName: 'Nox',
    };
    const token = signReceipt(secret, claims, 5_000);
    assert.deepEqual(verifyReceipt(secret, token, 4_000), claims);
    assert.equal(verifyReceipt(secret, token, 5_000), null);
    assert.equal(verifyReceipt('outra-chave-com-32-caracteres!!', token, 4_000), null);
    assert.equal(verifyReceipt(secret, `${token}x`, 4_000), null);
  });
});

describe('ficha', () => {
  it('exige aceite desmarcado e os campos do personagem', () => {
    const refused = validateSubmissionFields({
      characterName: 'Nox',
      socialNetwork: 'tiktok',
      handle: 'criador',
      accepted: false,
      termsVersion: TERMS_VERSION,
    });
    assert.equal(refused.ok, false);

    const accepted = validateSubmissionFields({
      characterName: 'Nox',
      socialNetwork: 'instagram',
      handle: 'criador',
      accepted: 'true',
      termsVersion: TERMS_VERSION,
    });
    assert.equal(accepted.ok, true);
    if (accepted.ok) assert.equal(accepted.value.handle, '@criador');
  });

  it('limita repetição e só trava duplicata depois do sucesso', () => {
    const first = beginSubmission('203.0.113.10', 'hash-a', 1_000);
    assert.equal(first.ok, true);
    if (first.ok) first.finish(false);
    const retry = beginSubmission('203.0.113.10', 'hash-a', 2_000);
    assert.equal(retry.ok, true);
    if (retry.ok) retry.finish(true);
    const duplicate = beginSubmission('203.0.113.10', 'hash-a', 3_000);
    assert.equal(duplicate.ok, false);

    for (let index = 0; index < 8; index += 1) {
      const attempt = beginSubmission('203.0.113.20', `hash-${index}`, 10_000 + index);
      assert.equal(attempt.ok, true);
      if (attempt.ok) attempt.finish(false);
    }
    assert.equal(beginSubmission('203.0.113.20', 'hash-extra', 20_000).ok, false);
  });
});

describe('apps script', () => {
  it('só libera sucesso com JSON confirmado', () => {
    const ok = interpretGasBody(
      JSON.stringify({
        ok: true,
        fileId,
        metadataFileId,
        fileName: `${submissionId}.png`,
        submissionId,
      }),
    );
    assert.equal(ok.ok, true);
    assert.equal(interpretGasBody(JSON.stringify({ ok: true, fileId, fileName: `${submissionId}.png` })).ok, false);

    assert.equal(interpretGasBody(JSON.stringify({ ok: true })).ok, false);
    assert.equal(interpretGasBody('<html>login</html>').ok, false);
    assert.equal(interpretGasBody('{"ok":true,"fileName":"FALSO.png"}').ok, false);

    const refused = interpretGasBody(JSON.stringify({ ok: false, error: 'Não autorizado.' }));
    assert.deepEqual(refused, { ok: false, error: 'Não autorizado.', status: 401 });
  });

  it('aceita somente a URL de implantação do Google', () => {
    assert.equal(
      assertAppsScriptUrl('https://script.google.com/macros/s/Abc_123-XYZ/exec?usp=sharing'),
      'https://script.google.com/macros/s/Abc_123-XYZ/exec',
    );
    assert.throws(() => assertAppsScriptUrl('http://script.google.com/macros/s/Abc/exec'));
    assert.throws(() => assertAppsScriptUrl('https://script.google.com/macros/s/Abc/dev'));
    assert.throws(() => assertAppsScriptUrl('https://example.com/macros/s/Abc/exec'));
  });

  it('segue o redirect 302 com GET e ignora um sucesso falso no primeiro salto', async () => {
    const server = createServer((req, res) => {
      if (req.method === 'POST' && req.url === '/exec') {
        res.writeHead(302, { Location: '/done' });
        res.end(JSON.stringify({ ok: true, fileId, fileName: 'FALSO.png' }));
        return;
      }
      if (req.method === 'GET' && req.url === '/done') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            ok: true,
            fileId,
            metadataFileId,
            fileName: `${submissionId}.png`,
            submissionId,
          }),
        );
        return;
      }
      res.writeHead(405);
      res.end('method');
    });

    const port = await listen(server);
    try {
      const text = await postToAppsScript(`http://127.0.0.1:${port}/exec`, { token: 'x' }, {
        redirectHosts: new Set(['127.0.0.1']),
      });
      assert.match(text, new RegExp(submissionId));
      assert.doesNotMatch(text, /FALSO/);
      const confirmed = interpretGasBody(text);
      assert.equal(confirmed.ok, true);
      if (confirmed.ok) {
        assert.equal(confirmed.fileId, fileId);
        assert.equal(confirmed.metadataFileId, metadataFileId);
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it('recusa redirect para fora do Google', async () => {
    const server = createServer((_req, res) => {
      res.writeHead(302, { Location: 'https://example.com/stolen' });
      res.end(JSON.stringify({ ok: true, fileId, fileName: 'FALSO.png' }));
    });
    const port = await listen(server);
    try {
      await assert.rejects(
        () => postToAppsScript(`http://127.0.0.1:${port}/exec`, { token: 'x' }),
        /fora do Google/,
      );
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe('segredos', () => {
  it('mantém o ID da pasta somente no Apps Script', () => {
    const code = readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
    const match = code.match(/FOLDER_ID = '([^']+)'/);
    assert.ok(match);
    const folderId = match[1];
    const leaks: string[] = [];

    const walk = (directory: string) => {
      for (const entry of readdirSync(directory)) {
        if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue;
        const full = path.join(directory, entry);
        if (statSync(full).isDirectory()) {
          walk(full);
          continue;
        }
        const relative = path.relative(root, full);
        if (relative === path.join('apps-script', 'Code.gs')) continue;
        const source = readFileSync(full);
        if (source.includes(Buffer.from(folderId))) leaks.push(relative);
      }
    };

    walk(root);
    assert.deepEqual(leaks, []);
    assert.equal(code.includes('BEGIN PRIVATE KEY'), false);
    assert.equal(code.includes(TERMS_VERSION), true);
    assert.equal(code.includes(TERMS_TEXT), true);
  });

  it('espelha as mensagens seguras no Code.gs', () => {
    const code = readFileSync(path.join(root, 'apps-script', 'Code.gs'), 'utf8');
    for (const message of GAS_ERROR_MESSAGES) {
      assert.equal(code.includes(message), true, message);
    }
  });
});

describe('admin', () => {
  it('só aceita o login do lead e uma sessão assinada', () => {
    assert.equal(credentialsMatch('lion', 'dragon'), true);
    assert.equal(credentialsMatch('lion', 'dragons'), false);
    assert.equal(credentialsMatch('Lion', 'dragon'), false);
    const token = signAdminSession(Date.now() + 60_000);
    assert.equal(verifyAdminSession(token, Date.now()), true);
    assert.equal(verifyAdminSession(token, Date.now() + 120_000), false);
    assert.equal(verifyAdminSession(`${token}x`, Date.now()), false);
  });

  it('recusa cor e link fora do formato', () => {
    assert.equal(parseSettings({ ...DEFAULT_SETTINGS, accent: 'red' }), null);
    assert.equal(parseSettings({ ...DEFAULT_SETTINGS, instagram: 'javascript:alert(1)' }), null);
    const saved = parseSettings({
      ...DEFAULT_SETTINGS,
      active: false,
      accent: '#3366FF',
      instagram: 'https://www.instagram.com/losttapes/',
    });
    assert.ok(saved);
    if (saved) {
      assert.equal(saved.active, false);
      assert.equal(saved.accent, '#3366ff');
      assert.equal(saved.instagram, 'https://www.instagram.com/losttapes/');
    }
  });

  it('não trata a contagem do Drive como um envio confirmado', () => {
    const count = interpretCountBody('{"ok":true,"count":3}');
    assert.deepEqual(count, { ok: true, count: 3 });
    assert.equal(interpretGasBody('{"ok":true,"count":3}').ok, false);
  });
});

after(() => {
  assert.ok(secret.length >= 24);
});
