# Arquivo de Artes

Ficha para inscrever um personagem como figurante de Lost Tapes. A imagem e um JSON com os dados do envio só entram na pasta do Google Drive depois que o Apps Script confirma a gravação. A tela de sucesso não abre sem essa confirmação.

O navegador envia a ficha para `/api/upload`. O Next.js confere os campos, o aceite dos termos, o tamanho e os bytes da imagem. Em seguida chama o web app do Apps Script. O ID da pasta fica apenas em `apps-script/Code.gs`.

## Requisitos

- Node.js 20 ou mais recente
- Uma conta Google com acesso de editor à pasta de destino
- O ID dessa pasta já está no `Code.gs`

## Instalar

```bash
npm install
```

No PowerShell:

```powershell
Copy-Item .env.example .env.local
```

No bash:

```bash
cp .env.example .env.local
```

Gere o token:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Coloque o mesmo valor em `APPS_SCRIPT_TOKEN` no `.env.local` e na propriedade `UPLOAD_TOKEN` do Apps Script.

## Subir o site

```bash
npm run dev
```

Abra `http://localhost:3000`.

```bash
npm test
npm run build
npm start
```

## Implantar o Apps Script

1. Abra [script.google.com](https://script.google.com) com a conta que é editora da pasta.
2. Crie um projeto e substitua o conteúdo de `Código.gs` pelo arquivo `apps-script/Code.gs`.
3. Salve o projeto.
4. Abra o ícone de engrenagem, entre em **Propriedades do script** e crie `UPLOAD_TOKEN` com o mesmo valor de `APPS_SCRIPT_TOKEN`.
5. No seletor de funções, escolha `verificarPasta` e execute. Autorize o acesso ao Google Drive quando o Google pedir. Em **Execuções**, o registro mostra o nome da pasta e confirma que o token existe.
6. Clique em **Implantar** → **Nova implantação**.
7. Tipo: **App da Web**.
8. Executar como: **Eu**.
9. Quem pode acessar: **Qualquer pessoa**.
10. Implante, autorize e copie o URL que termina em `/exec`.
11. Cole esse URL em `APPS_SCRIPT_URL` no `.env.local`.
12. Abra o `/exec` numa janela anônima. A resposta esperada é `{"ok":true,"service":"arquivo-de-artes"}`.

A execução usa a sua conta. A pasta pode continuar privada. Compartilhe a pasta somente com essa conta, como editora. O site não pede que a pasta fique aberta para edição pública.

Depois de alterar o `Code.gs`, abra **Implantar** → **Gerenciar implantações**, edite a implantação e escolha **Nova versão**. O URL `/exec` permanece o mesmo.

`apps-script/appsscript.json` é o manifesto para quem publica com clasp. No editor da web, o `Code.gs` sozinho já pede a permissão do Drive na primeira execução.

## O que a ficha pede

- Nome do personagem
- TikTok ou Instagram
- @ do criador
- Uma imagem PNG, JPG ou WEBP de até 10 MB
- Aceite da autorização, com a caixa começando desmarcada: uso gratuito do personagem, sem necessidade de remuneração

O texto aceito, a versão e a hora UTC ficam no JSON do envio. `/termos` mostra esse texto. `/privacidade` explica a coleta do perfil e do arquivo.

## O que o envio faz

1. A pessoa preenche a ficha e marca a autorização.
2. O navegador mede o progresso real até o Next.js e mostra **TRANSMITINDO PERSONAGEM...**. Sem número quando o navegador não informa o progresso.
3. A rota confere os campos, o aceite, a versão dos termos, o tamanho e os bytes da imagem.
4. O servidor limita a frequência por IP, só na memória, e impede uma duplicata acidental depois de um envio confirmado. Uma falha de rede pode ser tentada de novo.
5. O servidor manda ao Apps Script o token, a imagem em base64 e os metadados. O token não vai para o navegador.
6. O Apps Script confere tudo de novo e cria uma pasta para aquele envio, com o nome do personagem, o @ e um pedaço do identificador. Dentro ficam a imagem, `ficha.txt` e `{id}.json`. Se qualquer arquivo falhar, a pasta vai para a lixeira.
7. O servidor só aceita JSON com `ok: true`, dois IDs diferentes do Drive e o mesmo identificador do envio. Um redirect 302 do Google é seguido com GET; o corpo do redirect não conta como sucesso.
8. Com essa confirmação, o servidor grava um cookie assinado. O navegador consulta `/api/receipt` e só então abre `/obrigado`.

`/obrigado` mostra **PERSONAGEM RECEBIDO!** e avisa que o envio não garante participação. Sem o cookie, a rota volta para a home. O cookie dura 30 minutos. **ENVIAR OUTRO PERSONAGEM** apaga o cookie e volta ao início.

## Variáveis

| Nome | Onde fica | Função |
| --- | --- | --- |
| `APPS_SCRIPT_URL` | `.env.local`, só no servidor | URL `/exec` da implantação |
| `APPS_SCRIPT_TOKEN` | `.env.local`, só no servidor | Igual a `UPLOAD_TOKEN` |
| `UPLOAD_TOKEN` | Propriedades do Apps Script | Autoriza o POST |
| ID da pasta | `apps-script/Code.gs` | Destino no Drive |

Não coloque o ID da pasta, o token ou uma chave de serviço no frontend. Este projeto não usa conta de serviço.

## Deploy

Arquivos de até 10 MB pedem um Node com corpo de requisição acima disso. A Vercel corta o corpo por volta de 4,5 MB, então um arquivo maior falha antes da confirmação. Para o limite de 10 MB, rode o Next em uma VPS, no Railway, no Render ou com Docker:

```bash
docker build -t arquivo-de-artes .
docker run --env-file .env.local -p 3000:3000 arquivo-de-artes
```

Passe `APPS_SCRIPT_URL` e `APPS_SCRIPT_TOKEN` no ambiente de execução. Elas são lidas a cada envio.

Sirva o site em HTTPS. O cookie de confirmação fica `Secure` quando a requisição chega como HTTPS.

O limite de envios vale por processo. Se houver mais de uma instância, cada uma conta os acessos que recebe.

## Se o envio não confirmar

- O web app precisa estar como **Eu** e **Qualquer pessoa**. Outra opção de acesso devolve uma página de login, e o site recusa a confirmação.
- `UPLOAD_TOKEN` e `APPS_SCRIPT_TOKEN` precisam ser idênticos e ter pelo menos 24 caracteres.
- A conta da implantação precisa abrir a pasta. Rode `verificarPasta` de novo depois de compartilhá-la.
- Cada edição do script pede uma nova versão da implantação.
- Uma resposta sem a confirmação dos dois arquivos mantém a pessoa na ficha, com o erro visível. O site não marca envio sem essa confirmação.
