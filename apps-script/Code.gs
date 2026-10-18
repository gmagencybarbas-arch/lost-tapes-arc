/**
 * Arquivo de Artes — inscrição de personagens no Google Drive.
 *
 * O ID da pasta existe somente neste arquivo. O site nunca o recebe.
 * A conta que implanta o script precisa ser editora da pasta.
 * A pasta permanece privada: não abra edição para qualquer pessoa.
 *
 * Implantação: veja o README na raiz do projeto.
 * Propriedade do script obrigatória: UPLOAD_TOKEN
 */

var FOLDER_ID = '1bX4GcjUBARNhoMDMN1YhyFbMeAVoyhdI';
var MAX_BYTES = 10 * 1024 * 1024;
var MAX_BASE64_LENGTH = 14000000;
var TERMS_VERSION = '2026-10-18';
var TERMS_TEXT =
  'O responsável pelo envio declara ter os direitos necessários sobre o personagem e concede autorização gratuita, não exclusiva e sem necessidade de remuneração, para utilizar, adaptar, modificar, reproduzir e exibir o personagem como figurante nos episódios de Lost Tapes e em materiais relacionados à produção e divulgação, inclusive monetizados. A equipe tem liberdade criativa dentro desse escopo. Não há pagamento nem garantia de aparição. O envio não transfere a titularidade da criação.';

var MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

function doGet() {
  return json({ ok: true, service: 'arquivo-de-artes' });
}

function doPost(e) {
  var packet = null;
  var imageFile = null;
  var metaFile = null;
  var noteFile = null;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return json({ ok: false, error: 'Pedido vazio.' });
    }

    var body = JSON.parse(e.postData.contents);
    var expected = PropertiesService.getScriptProperties().getProperty('UPLOAD_TOKEN');
    if (!expected) {
      return json({ ok: false, error: 'Token do arquivo não configurado.' });
    }
    if (typeof body.token !== 'string' || !tokensMatch(body.token, expected)) {
      return json({ ok: false, error: 'Não autorizado.' });
    }
    if (body.op === 'count') {
      var parentCount = DriveApp.getFolderById(FOLDER_ID);
      var found = parentCount.getFolders();
      var total = 0;
      while (found.hasNext()) {
        found.next();
        total += 1;
      }
      return json({ ok: true, count: total });
    }
    if (typeof body.mimeType !== 'string' || typeof body.data !== 'string' || typeof body.submissionId !== 'string') {
      return json({ ok: false, error: 'Pedido inválido.' });
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.submissionId)) {
      return json({ ok: false, error: 'Pedido inválido.' });
    }
    if (body.accepted !== true) {
      return json({ ok: false, error: 'Os termos não foram aceitos.' });
    }
    if (body.termsVersion !== TERMS_VERSION || body.termsText !== TERMS_TEXT) {
      return json({ ok: false, error: 'A versão dos termos não confere. Leia a autorização de novo.' });
    }

    var characterName = clean(body.characterName, 48);
    if (!characterName || characterName.length < 2) {
      return json({ ok: false, error: 'Informe o nome do personagem.' });
    }
    if (body.socialNetwork !== 'instagram' && body.socialNetwork !== 'tiktok') {
      return json({ ok: false, error: 'Escolha TikTok ou Instagram.' });
    }
    var handle = clean(body.handle, 41);
    if (!handle || !/^@[A-Za-z0-9._]{2,40}$/.test(handle)) {
      return json({ ok: false, error: 'Informe o @ do criador.' });
    }
    var mime = String(body.mimeType).toLowerCase();
    if (!MIME_EXTENSIONS[mime]) {
      return json({ ok: false, error: 'Formato não aceito. Use PNG, JPG ou WEBP.' });
    }
    if (!body.data) {
      return json({ ok: false, error: 'Arquivo ausente.' });
    }
    if (body.data.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.data)) {
      return json({ ok: false, error: 'Arquivo inválido.' });
    }

    var bytes = Utilities.base64Decode(body.data);
    if (!bytes || bytes.length < 12) {
      return json({ ok: false, error: 'Arquivo inválido.' });
    }
    if (bytes.length > MAX_BYTES) {
      return json({ ok: false, error: 'A imagem passa de 10 MB.' });
    }
    if (!magicMatches(bytes, mime)) {
      return json({ ok: false, error: 'O conteúdo não corresponde ao formato informado.' });
    }

    var storedName = body.submissionId + '.' + MIME_EXTENSIONS[mime];
    var metaName = body.submissionId + '.json';
    var noteName = 'ficha.txt';
    var parent = DriveApp.getFolderById(FOLDER_ID);
    var packetName = folderTitle(characterName, handle, body.submissionId);
    if (parent.getFoldersByName(packetName).hasNext()) {
      return json({ ok: false, error: 'Pedido inválido.' });
    }

    packet = parent.createFolder(packetName);
    var imageBlob = Utilities.newBlob(bytes, mime, storedName);
    imageFile = packet.createFile(imageBlob);

    var record = {
      submissionId: body.submissionId,
      characterName: characterName,
      socialNetwork: body.socialNetwork,
      handle: handle,
      originalFileName: sanitizeOriginalName(body.fileName),
      storedFileName: storedName,
      folderName: packetName,
      folderId: packet.getId(),
      imageFileId: imageFile.getId(),
      submittedAt: new Date().toISOString(),
      acceptedAt: acceptedAtFrom(body.acceptedAt),
      termsVersion: TERMS_VERSION,
      termsText: TERMS_TEXT,
      termsAccepted: true,
      remunerationRequired: false,
      appearanceNotGuaranteed: true,
      ownershipNotTransferred: true,
    };

    var metaBlob = Utilities.newBlob(JSON.stringify(record, null, 2), 'application/json', metaName);
    metaFile = packet.createFile(metaBlob);
    noteFile = packet.createFile(Utilities.newBlob(noteText(record), 'text/plain', noteName));
    try {
      imageFile.setDescription(
        'Personagem: ' +
          characterName +
          '\n@ ' +
          handle +
          '\nRede: ' +
          body.socialNetwork +
          '\nEnvio: ' +
          body.submissionId +
          '\nTermos: ' +
          TERMS_VERSION,
      );
    } catch (ignoreDescription) {}

    var confirmedImage = DriveApp.getFileById(imageFile.getId());
    var confirmedMeta = DriveApp.getFileById(metaFile.getId());
    var confirmedNote = DriveApp.getFileById(noteFile.getId());
    var confirmedFolder = DriveApp.getFolderById(packet.getId());
    if (
      confirmedFolder.getName() !== packetName ||
      confirmedImage.getName() !== storedName ||
      confirmedMeta.getName() !== metaName ||
      confirmedNote.getName() !== noteName ||
      confirmedImage.getSize() < 12 ||
      confirmedMeta.getSize() < 2 ||
      confirmedNote.getSize() < 2
    ) {
      throw new Error('confirmacao');
    }

    return json({
      ok: true,
      fileId: confirmedImage.getId(),
      metadataFileId: confirmedMeta.getId(),
      fileName: confirmedImage.getName(),
      submissionId: body.submissionId,
    });
  } catch (error) {
    if (noteFile) {
      try {
        noteFile.setTrashed(true);
      } catch (ignoreNote) {}
    }
    if (metaFile) {
      try {
        metaFile.setTrashed(true);
      } catch (ignoreMeta) {}
    }
    if (imageFile) {
      try {
        imageFile.setTrashed(true);
      } catch (ignore) {}
    }
    if (packet) {
      try {
        packet.setTrashed(true);
      } catch (ignoreFolder) {}
    }
    console.error(error && error.message ? error.message : error);
    return json({ ok: false, error: 'Não foi possível guardar o personagem no arquivo.' });
  }
}

function verificarPasta() {
  var folder = DriveApp.getFolderById(FOLDER_ID);
  var token = PropertiesService.getScriptProperties().getProperty('UPLOAD_TOKEN');
  console.log('Pasta acessível: ' + folder.getName());
  console.log(token ? 'UPLOAD_TOKEN definido.' : 'UPLOAD_TOKEN ausente.');
}

function json(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function tokensMatch(received, expected) {
  var digest = Utilities.DigestAlgorithm.SHA_256;
  var left = Utilities.computeDigest(digest, received, Utilities.Charset.UTF_8);
  var right = Utilities.computeDigest(digest, expected, Utilities.Charset.UTF_8);
  if (left.length !== right.length) return false;
  var diff = 0;
  for (var index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

function clean(value, max) {
  if (value == null) return '';
  var text = String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (text.length > max) return null;
  return text;
}

function sanitizeOriginalName(value) {
  var text = clean(value, 120);
  return text || 'imagem';
}

function folderTitle(characterName, handle, submissionId) {
  var raw = characterName + ' - ' + handle + ' - ' + submissionId.slice(0, 8);
  var cleaned = raw.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim();
  if (cleaned.length > 80) cleaned = cleaned.slice(0, 80).trim();
  return cleaned || submissionId;
}

function noteText(record) {
  return [
    'Personagem: ' + record.characterName,
    'Rede: ' + record.socialNetwork,
    'Criador: ' + record.handle,
    'Arquivo original: ' + record.originalFileName,
    'Arquivo salvo: ' + record.storedFileName,
    'Envio: ' + record.submissionId,
    'Enviado em (UTC): ' + record.submittedAt,
    'Aceite em (UTC): ' + record.acceptedAt,
    'Uso gratuito, sem remuneração: sim',
    'Aparição garantida: não',
    'Titularidade transferida: não',
    'Termos: ' + record.termsVersion,
    '',
    record.termsText,
    '',
  ].join('\n');
}

function acceptedAtFrom(value) {
  var now = new Date().toISOString();
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    return now;
  }
  var then = new Date(value).getTime();
  if (isNaN(then) || Math.abs(Date.now() - then) > 15 * 60 * 1000) return now;
  return value;
}

function byteAt(bytes, index) {
  var value = bytes[index];
  return value < 0 ? value + 256 : value;
}

function magicMatches(bytes, mime) {
  if (mime === 'image/png') {
    return (
      byteAt(bytes, 0) === 0x89 &&
      byteAt(bytes, 1) === 0x50 &&
      byteAt(bytes, 2) === 0x4e &&
      byteAt(bytes, 3) === 0x47 &&
      byteAt(bytes, 4) === 0x0d &&
      byteAt(bytes, 5) === 0x0a &&
      byteAt(bytes, 6) === 0x1a &&
      byteAt(bytes, 7) === 0x0a
    );
  }

  if (mime === 'image/jpeg') {
    return byteAt(bytes, 0) === 0xff && byteAt(bytes, 1) === 0xd8 && byteAt(bytes, 2) === 0xff;
  }

  if (mime === 'image/webp') {
    var riff = String.fromCharCode(byteAt(bytes, 0), byteAt(bytes, 1), byteAt(bytes, 2), byteAt(bytes, 3));
    var webp = String.fromCharCode(byteAt(bytes, 8), byteAt(bytes, 9), byteAt(bytes, 10), byteAt(bytes, 11));
    return riff === 'RIFF' && webp === 'WEBP';
  }

  return false;
}
