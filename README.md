# Portal Feira do Agricultor

Portal web para divulgar a Feira do Agricultor. Visitantes podem consultar
eventos, calendário e informações da feira; a aplicação também inclui páginas
administrativas para gerenciar o conteúdo.

## Tecnologias

- **Frontend:** React, TypeScript e Vite.
- **Backend:** Node.js, TypeScript e Express.
- **Banco de dados:** MySQL. O Sequelize CLI gerencia o esquema por migrations;
  a aplicação acessa os dados usando `mysql2`.

## Requisitos

Os arquivos de teste e seus resultados são locais e ignorados pelo Git. Os comandos
de teste documentados abaixo exigem os arquivos em `back-end/test` e
`front-end/tests`, que não acompanham novos clones do repositório.

- Git.
- Node.js e npm compatíveis com Vite 8 (Node.js 20.19+ ou 22.12+).
- MySQL instalado e em execução.

## Inicializar na sua máquina

### 1. Baixe o projeto

```sh
git clone https://github.com/ElAlerrandro/Portal-Feira-do-Agricultor.git
cd Portal-Feira-do-Agricultor
```

### 2. Configure o backend

No Windows PowerShell, crie o arquivo local de configuração copiando o exemplo:

```powershell
Copy-Item back-end/.env.example back-end/.env
```

No macOS/Linux, use:

```sh
cp back-end/.env.example back-end/.env
```

Edite `back-end/.env` e configure as credenciais do seu MySQL:

```dotenv
DB_HOST=localhost
DB_PORT=3306
DB_NAME=api_portal_feira
DB_USER=root
DB_PASSWORD=sua_senha_mysql
DB_SSL=false
PORT=8080
FRONTEND_URL=http://localhost:5173
JWT_ACCESS_SECRET=configure_um_segredo_aleatorio
JWT_REFRESH_SECRET=configure_outro_segredo_aleatorio
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Gere valores diferentes para os dois segredos JWT. Por exemplo, execute duas
vezes `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
e copie cada resultado para uma variável diferente. Não compartilhe nem versione
o arquivo `.env`.

Para usar o MySQL do Aiven, configure `DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER` e `DB_PASSWORD` com os valores do serviço e defina `DB_SSL=true`.
Se o certificado CA do serviço não for confiável por padrão no ambiente,
configure também `DB_SSL_CA` com o conteúdo PEM do certificado (use `\n` para
representar as quebras de linha ao cadastrar a variável).

### Recuperação de senha com Resend

O login oferece **Esqueci minha senha**. O formulário em
`#/admin/esqueci-minha-senha` solicita o link; o e-mail abre a nova tela
`#/admin/redefinir-senha?token=...` para cadastrar e confirmar a senha.

Configure estas variáveis no `back-end/.env` e no projeto **backend** da Vercel:

```dotenv
RESEND_API_KEY=sua_nova_chave_resend
EMAIL_FROM="Brotando Feiras <onboarding@resend.dev>"
PASSWORD_RESET_FRONTEND_URL=https://seu-frontend.vercel.app
RATE_LIMIT_PASSWORD_RECOVERY_CAPACITY=5
```

`PASSWORD_RESET_FRONTEND_URL` deve apontar para uma única URL estável e pública
do **frontend**, sem `#`, parâmetros ou lista de endereços. Localmente use
`http://localhost:5173`. Essa configuração é separada de `FRONTEND_URL`, que
continua definindo as origens permitidas pelo CORS. Nenhuma chave usa `VITE_`.
Se uma chave foi exposta em captura de tela ou no código, revogue-a e gere outra.

Durante os testes sem domínio próprio, use `onboarding@resend.dev` como remetente
e uma conta administrativa cujo e-mail seja o e-mail da sua conta Resend.
Para enviar para outros destinatários, verifique um domínio de envio no Resend e
atualize `EMAIL_FROM`. Referências: [API de envio](https://resend.com/docs/api-reference/emails/send-email)
e [domínios verificados](https://resend.com/docs/dashboard/domains/introduction).

Antes de iniciar/publicar, execute `npm run db:migrate` em `back-end` para criar
`password_reset_tokens` pela migration `20261021150000-create-password-reset-tokens.js`.
Depois, publique backend e frontend. O modelo HTML com estilos inline, assunto e
versão em texto ficam em `back-end/src/service/passwordResetEmail.ts`.

As rotas públicas são `POST /admin/forgot-password` (`{ "email": "..." }`) e
`POST /admin/reset-password` (`{ "token": "...", "password": "..." }`). O link
expira em **15 minutos**, só funciona uma vez e uma nova solicitação substitui o
link anterior. O banco guarda apenas o SHA-256 do token aleatório de 32 bytes;
o token original só vai no link, no fragmento da URL. Mudanças posteriores de
e-mail/senha e contas inativas impedem o uso do link. A nova senha exige ao menos
8 caracteres e no máximo 72 bytes UTF-8, evitando truncamento pelo bcrypt.

A troca da senha, consumo do token e remoção dos refresh tokens ocorrem na mesma
transação. Uma renovação concorrente não recria uma sessão revogada. JWTs de acesso
já emitidos continuam válidos até sua expiração original (até 5 minutos).

O pedido de recuperação retorna a mesma mensagem para contas existentes e
inexistentes. Falhas do provedor também mantêm essa resposta e invalidam o link
que não pôde ser enviado; consulte os logs de envio no Resend e o aviso genérico
no backend para diagnosticar. Falhas de configuração/banco retornam 503.
O envio é aguardado antes de encerrar a requisição, inclusive na Vercel.

Validação local: `npm test` cobre validação, envio simulado, respostas e limites.
`npm run test:password-recovery:mysql` verifica a migration, concorrência, expiração,
revogação de sessões e rollback no MySQL, criando/removendo apenas um schema
temporário `password_reset_test_<uuid>` com as credenciais `DB_*`.
No frontend, `node tests/passwordRecovery.browser.mjs` executa o fluxo nas telas
reais com respostas simuladas, verifica larguras de 320 a 1440 px e salva capturas
em `output/password-recovery`. Usa o Edge sem janela no Windows; para outro
navegador Chromium, informe o executável em `BROWSER_PATH`.

### Exclusão de administradores

`DELETE /admin/:id` exige uma sessão autenticada. Um `SUPER_ADMIN` pode excluir
um `ADMIN` previamente desativado, mas nunca outro `SUPER_ADMIN`. Administradores
comuns não podem excluir outras contas. Ambos os perfis podem excluir a própria
conta ativa em **Minha conta**, enviando a senha atual no corpo `{ "password": "..." }`.

O último `SUPER_ADMIN` ativo não pode excluir, desativar ou rebaixar a própria
conta: é preciso promover ou reativar outro Super Admin primeiro. Um Super Admin
ativo pode reativar outro Super Admin com `PATCH /admin/:id` e corpo exclusivamente
`{ "active": true }`. Desativação, rebaixamento e demais alterações na conta de
outro Super Admin são bloqueados, evitando o rebaixamento seguido de exclusão.
As verificações e alterações usam a mesma transação com
bloqueios no banco para proteger saídas simultâneas.

Na autoexclusão, a responsabilidade pelos eventos vinculados é transferida para
outro Super Admin ativo, sem apagar os eventos. Quando um Super Admin exclui um
Admin comum desativado, os eventos passam para o Super Admin que confirmou a
exclusão. Os dados dos eventos e suas imagens são preservados; o diálogo de
confirmação informa a transferência de responsabilidade. A exclusão remove os refresh
tokens e a conta na mesma transação; links de recuperação de senha são removidos
pela chave estrangeira existente. O cookie e o estado local da sessão são limpos.
Requisições autenticadas consultam a conta atual no banco, impedindo o uso de
tokens de contas excluídas, inativas ou com permissões antigas. Não exige migration.

Contas inexistentes retornam `404` (`ADMIN_NOT_FOUND`), exclusões de outros Super Admins
retornam `403` (`SUPER_ADMIN_DELETE_FORBIDDEN`), a saída do último principal ativo
retorna `409` (`LAST_SUPER_ADMIN`) e contas com eventos vinculados sem transferência
retornam `409` (`ADMIN_HAS_EVENTS`). Nesse último caso, é necessário disponibilizar
um Super Admin ativo para assumir os eventos. O painel mostra uma mensagem específica
para cada situação.

`npm test` cobre as permissões e respostas da API.
`npm run test:admin-deletion:mysql`, em `back-end`, reproduz a falha antiga de
chave estrangeira e verifica exclusão, rollback e concorrência em um schema
temporário `admin_delete_test_<uuid>`, removido ao final. No frontend,
`node --test tests/adminDeletion.test.mjs` verifica as mensagens do painel.
`node tests/adminPermissions.browser.mjs` verifica autoexclusão, senha, bloqueio
do último Super Admin, encerramento de sessão e proteção entre pares nas telas
reais com respostas simuladas, incluindo larguras de 320 a 1440 px.

### Eventos por administrador

O painel usa `GET /event/admin`, autenticado para administradores comuns e
principais. A resposta inclui `administratorId`, `administratorName` e
`administratorActive`, inclusive para criadores desativados. A listagem pública
`GET /event` mantém seu contrato. Não é necessária migration.

Em **Eventos > Filtros > Administrador**, selecione todos, seus eventos ou um
criador específico. Os filtros são combinados no navegador. Os cards mostram
quem cadastrou o evento; editar um evento não muda o criador.

`npm test`, em `back-end`, verifica as permissões da rota.
`node tests/eventAdministrators.browser.mjs`, em `front-end`, verifica os filtros,
a preservação do criador e o layout de 320 a 1894 px com respostas simuladas.
Capturas de tela ficam em `output/event-administrators`.

### Imagens no Cloudinary

Novos uploads usam o [SDK Node.js do Cloudinary](https://cloudinary.com/documentation/node_integration).
Preencha as **Product Environment Credentials** em `back-end/.env` e nas
variáveis do projeto **backend** da Vercel:

```dotenv
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

Alternativamente, deixe os três campos vazios e preencha somente
`CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME`, copiando a **API
environment variable** do Cloudinary. Os campos separados têm prioridade;
um conjunto incompleto gera erro de configuração. Nenhuma dessas credenciais
usa prefixo `VITE_`. Reinicie o backend local ou publique novamente o backend
e frontend após configurar a produção. Não é necessário instalar SDK React
nem criar um preset de upload sem assinatura.

Na criação e edição, capas e fotos da galeria aceitam JPG/PNG de até **10 MB
por imagem**. O frontend solicita uma autorização autenticada em
`POST /event/image/upload/authorize`, envia o arquivo diretamente ao Cloudinary
com os parâmetros assinados e confirma em `POST /event/image/upload/complete`.
Assim, o arquivo não passa pelo limite de corpo das funções da Vercel.
O API Secret permanece somente no backend; o navegador recebe a API Key pública,
uma assinatura e um ticket com validade de uma hora, vinculado ao administrador.
O backend consulta os metadados no Cloudinary e verifica formato e tamanho real
antes de devolver a URL. Tentativas acima de 10 MB são rejeitadas, com remoção
do arquivo excedente quando possível. Falhas na confirmação podem ser repetidas
sem reenviar a foto. Não é necessário configurar um preset adicional.

A rota antiga `POST /event/image/upload` permanece em **4 MB** para clientes
anteriores; o formulário atualizado usa o novo fluxo direto de 10 MB.
A resposta final mantém o contrato `{ "url": "https://res.cloudinary.com/..." }`.
As fotos dos eventos são públicas, entregues diretamente pela CDN. As URLs
originais permanecem em `events.bannerImage` e `images.imageUrl`; os arquivos
ficam no Cloudinary. Nenhuma alteração de esquema MySQL é necessária.

#### Qualidade e versões menores (mipmaps/downsampling)

O original é armazenado intacto, sem uma transformação destrutiva no upload.
Na exibição, uma pirâmide de larguras **160, 320, 640, 1280 e 2560 px** é
oferecida por `srcset`/`sizes` nas capas, galerias, editor e foto ampliada.
O navegador escolhe a versão conforme o espaço disponível e a densidade da
tela. Cada versão deriva diretamente do original, preserva a proporção e usa
`c_limit`, que reduz sem ampliar imagens pequenas. Não há recodificação em
cascata, nem corte gravado no arquivo; o enquadramento visual continua no CSS.

`q_auto:best` prioriza qualidade visual e `f_auto` negocia o formato suportado
pelo navegador (por exemplo, WebP/AVIF quando disponíveis na conta).
Redimensionamento e compressão não são matematicamente sem perdas: a garantia
de preservação é do original. As versões menores buscam manter a aparência
na resolução exibida. Elas são geradas sob demanda e ficam em cache no
Cloudinary, evitando pré-gerar formatos/tamanhos que ninguém usa. Derivados
também consomem armazenamento e transformações na conta; preservar o original
é uma escolha de qualidade, não uma promessa de menor armazenamento total.

Mantenha as transformações dinâmicas habilitadas no Cloudinary (Strict
Transformations desativado, ou as transformações usadas pelo projeto
explicitamente permitidas). `f_auto` é aplicado apenas na entrega, pois depende
do navegador. Referências: [otimização](https://cloudinary.com/documentation/image_optimization),
[redimensionamento](https://cloudinary.com/documentation/resizing_and_cropping) e
[transformações derivadas](https://cloudinary.com/documentation/eager_and_incoming_transformations).

#### Migrar as fotos que já estão no Blob

Durante a transição, mantenha `BLOB_STORE_ID` e `BLOB_READ_WRITE_TOKEN` do
store antigo no backend. O pacote `@vercel/blob` permanece somente para leitura
legada e migração; novos uploads sempre usam Cloudinary, sem fallback para Blob.
A rota antiga `/event/image/file` mantém a verificação de vínculo no MySQL e
a revalidação por ETag/304, para as fotos existentes continuarem aparecendo.

Após preencher as credenciais, execute em `back-end` (PowerShell):

```powershell
# Somente consulta o MySQL e conta as fotos pendentes; não grava nem faz upload.
npm.cmd run images:migrate:cloudinary

# Copia os arquivos e atualiza capas/galerias no MySQL.
npm.cmd run images:migrate:cloudinary -- --apply
```

A migração considera URLs privadas geradas pela aplicação e exige o mesmo
store configurado. Cada URL compartilhada é copiada uma vez, e seus vínculos
em ambas as tabelas são atualizados na mesma transação. Se falhar, a URL antiga
permanece; a execução retorna código de erro e pode ser repetida. Um ID estável
no Cloudinary evita cópias duplicadas após falhas de SQL. Arquivos do Blob não
são apagados. Só remova as credenciais antigas após confirmar zero fotos Blob
pendentes e conferir as fotos migradas no site.

Links externos e previews locais permanecem compatíveis. Fotos antigas em
`/uploads` devem ser reenviadas pelo painel. Excluir/substituir um vínculo no
MySQL não apaga automaticamente o arquivo no Cloudinary; uploads abandonados
também permanecem na conta, como ocorria no armazenamento anterior.

Validação local: `npm.cmd test` e `npm.cmd run build` em `back-end`;
`node --test tests/eventImage*.test.mjs`, `npm.cmd run build` e
`npm.cmd run lint` em `front-end`. Os testes simulam os provedores e o MySQL;
um upload real e a migração real precisam das credenciais configuradas.

### Publicação na Vercel

Configure o frontend e o backend como projetos separados. No frontend, defina
`VITE_API_BASE_URL` com a URL pública estável do backend, sem barra final; essa
variável é incorporada durante o build, portanto publique novamente o frontend
depois de alterá-la. No backend, configure as variáveis do banco acima,
`FRONTEND_URL` com a origem exata do frontend (sem caminho ou barra final) e os
segredos JWT. Para autorizar mais de uma origem, separe-as por vírgula, por
exemplo a URL de produção e uma URL de preview. Atualize essa variável nas
configurações do projeto backend na Vercel e faça novo deploy sempre que mudar
as origens. A API precisa estar acessível publicamente pelo navegador: desative
a proteção de Deployment/Authentication para a implantação de produção ou use
um domínio de produção não protegido. Não use o URL de preview protegido.
No backend, mantenha o middleware de autenticação do Express em
`authMiddleware.ts`, não em `middleware.ts`: a Vercel reserva esse nome para o
middleware da própria plataforma.

### Limites de requisições da API

Todas as rotas atuais da API usam **Token Bucket**. Cada requisição consome um
token; o saldo é reposto continuamente e nunca ultrapassa a capacidade. Os valores
abaixo são compartilhados pelas rotas do mesmo grupo, evitando que a troca de URL,
ID do recurso ou token de acesso renove a cota.

| Rotas/grupo | Identificação | Capacidade / reposição em 15 minutos |
| --- | --- | --- |
| `POST /admin/login` | IP **e**, separadamente, e-mail normalizado | 5 em cada bucket |
| GET/HEAD públicos: eventos, imagens e informações da feira | IP | 300 |
| Rotas protegidas por JWT | `adminId` do JWT validado | 300 |
| `PATCH /admin/:id` com `password` | `adminId`, além da cota autenticada | 5 |
| `POST /admin/forgot-password` | IP e e-mail normalizado, em buckets próprios | 5 em cada bucket |
| `POST /admin/reset-password` | IP, em bucket próprio | 5 |
| `POST /message/create` | IP | 10 |
| `POST /admin/refresh` e `/admin/logout` | `adminId` do refresh JWT válido; IP se ausente/inválido | 30 |
| Acesso a rotas protegidas com credenciais ausentes/inválidas | IP | 60 |

O login permite um pico inicial de 5 tentativas e repõe **1 tentativa a cada
3 minutos**, até acumular 5. Isso não representa um máximo rígido de 5 em qualquer
janela de 15 minutos. Tentativas bem-sucedidas e malsucedidas consomem tokens.
E-mails têm espaços externos removidos e são convertidos para minúsculas apenas
para identificar o bucket. IPv4 mapeado em IPv6 é normalizado; endereços IPv6 da
mesma sub-rede `/64` compartilham a cota. Recuperação e redefinição de senha usam
`RATE_LIMIT_PASSWORD_RECOVERY_CAPACITY`, sem consumir os buckets do login.

A rota inicial de cadastro do Root, `/admin/register/force`, permanece comentada
no código e responde 404. O cadastro normal em `/admin/register` exige um
SUPER_ADMIN autenticado.

O excesso retorna **429** com `code: RATE_LIMIT_EXCEEDED`, `retryAfter` em segundos
e o cabeçalho `Retry-After`. `RateLimit-Limit`, `RateLimit-Remaining` e
`RateLimit-Reset` também são expostos via CORS; `RateLimit-Reset` informa os segundos
até o bucket ficar cheio. Nos grupos com dois buckets, os cabeçalhos descrevem o
último avaliado ou aquele que bloqueou a requisição. `OPTIONS` não consome tokens.

O armazenamento padrão é o **MySQL já configurado**, com uma transação e bloqueio
de linha por consumo. Isso mantém o saldo compartilhado entre instâncias e
reinicializações da Vercel. Apenas hashes dos identificadores são persistidos;
registros inativos são removidos em lotes de até 500 durante o tráfego, no máximo
uma vez por minuto por instância. Se o armazenamento falhar, a API retorna **503**
com `code: RATE_LIMIT_UNAVAILABLE`; a proteção não é desativada silenciosamente.
Esse controle acrescenta transações ao banco por requisição; em tráfego elevado,
o contrato `TokenBucketStore` permite substituir o armazenamento por um serviço
dedicado sem alterar as rotas.

**Antes de iniciar ou publicar esta versão**, aplique a migration
`20261021120000-create-rate-limit-buckets.js` com `npm run db:migrate` dentro de
`back-end`. Ajuste as variáveis `RATE_LIMIT_*_CAPACITY` do `.env.example` para mudar
as capacidades e reinicie/publique novamente a API. Alterar uma capacidade inicia
novos buckets para a política modificada. `RATE_LIMIT_STORE=memory` é permitido
somente no desenvolvimento com um processo ou em testes; não é aceito em produção
nem na Vercel. Não é necessário instalar um novo serviço.

Localmente, a API não confia em cabeçalhos de proxy por padrão. Na Vercel
(`VERCEL=1`), confia em um salto: a plataforma sobrescreve `X-Forwarded-For`.
Para outros ambientes, configure `TRUST_PROXY` com IPs/sub-redes confiáveis ou o
número exato de saltos; `true` não é aceito. A configuração deve refletir o caminho
real até a aplicação. Consulte as documentações de
[proxies do Express](https://expressjs.com/en/guide/behind-proxies/) e
[cabeçalhos da Vercel](https://vercel.com/docs/headers/request-headers).

Instale as dependências e crie o banco e as tabelas:

```sh
cd back-end
npm install
npm run db:create
npm run db:migrate
```

`db:create` cria o banco configurado em `DB_NAME`, e `db:migrate` cria as tabelas
e registra as migrations aplicadas. O usuário do MySQL precisa ter permissão
para criar o banco. Se você já o criou manualmente, pule `db:create` e rode
`npm run db:migrate`.

Após publicar alterações de esquema, execute também `npm run db:migrate` contra
o banco de produção. A migration de papéis de administrador converte `normal`
para `ADMIN` e `master` para `SUPER_ADMIN`, alinhando os valores existentes ao
backend.
The event-coordinate migration also makes `localLatitude` and `localLongitude`
nullable without changing existing values.
The refresh-token expiry migration changes the expiry column to `DATETIME` so
it preserves the full token lifetime. In production, refresh cookies use
`SameSite=None; Secure` because the frontend and API are hosted on separate
Vercel domains; local development keeps `SameSite=Lax`.

A configuração do Sequelize CLI fica em `back-end/db/config/config.js` e lê
as variáveis `DB_*` de `back-end/.env` localmente ou do ambiente de produção.
Cadastre as mesmas variáveis no projeto backend da Vercel; não coloque
credenciais no código ou em arquivos de configuração estáticos.

Se a migration inicial falhar com `Duplicate key name 'administrators_unique'`,
rode novamente `npm run db:migrate` com esta versão corrigida. A migration
retoma a tabela `administrators` já criada pela tentativa anterior e continua
criando as tabelas restantes.

> A migration inicial espera que o banco não tenha tabelas. Se pretende usar um
> banco que já contém tabelas ou dados, faça backup e defina uma estratégia de
> baseline antes de aplicar as migrations.

### 3. Inicie o backend

Ainda na pasta `back-end`, execute:

```sh
npm run dev
```

O backend ficará disponível em `http://localhost:8080`.

### 4. Instale e inicie o frontend

Abra outro terminal na raiz do projeto:

```sh
cd front-end
npm install
npm run dev
```

Abra no navegador o endereço informado pelo Vite, normalmente
`http://localhost:5173`. Durante o desenvolvimento, o Vite encaminha as
requisições da API para `http://localhost:8080`; assim o navegador não chama
diretamente a API de produção nem depende do CORS da Vercel.

## Comandos úteis

Execute os comandos do backend dentro de `back-end`:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o backend em modo de desenvolvimento. |
| `npm test` | Verifica limites, autenticação, upload, leitura privada e persistência das URLs com dependências simuladas. |
| `npm run test:rate-limit:mysql` | Teste opcional de migration, concorrência e reposição no MySQL real; cria e remove um banco temporário próprio. |
| `npm run db:migrate:status` | Lista migrations aplicadas e pendentes. |
| `npm run db:migrate` | Aplica as migrations pendentes. |
| `npm run db:migrate:undo` | Reverte a migration aplicada mais recentemente. |
| `npx sequelize-cli migration:generate --name nome-da-alteracao` | Gera um arquivo para uma nova migration em `db/migrations`. |

O teste MySQL usa as credenciais `DB_*` do backend e exige permissão para criar e
remover bancos no servidor indicado. Execute-o somente em um servidor autorizado
para testes. O nome temporário começa com `rate_limit_test_` e recebe um UUID;
o banco da aplicação não recebe migrations nem dados desse teste.

Execute os comandos do frontend dentro de `front-end`:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o servidor de desenvolvimento do Vite. |
| `npm run build` | Verifica os tipos e gera a versão de produção. |
| `npm run lint` | Executa o ESLint. |

## Observações

- As migrations Sequelize ficam em `back-end/db/migrations`. Ao mudar o esquema,
  crie uma migration nova com as alterações `up` e sua reversão `down`; não
  altere migrations que já foram aplicadas em outros ambientes.
- O arquivo `back-end/db/database_portal.sql` é uma referência SQL manual; ele
  não é executado pelo Sequelize CLI.
- `back-end/.env` contém configurações e segredos locais e não deve ser enviado
  ao Git.
