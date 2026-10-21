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
BLOB_STORE_ID=store_seu_id
BLOB_READ_WRITE_TOKEN=token_do_seu_store_privado
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

### Imagens no Vercel Blob

Crie um store **privado** no Vercel Blob e configure `BLOB_STORE_ID` e
`BLOB_READ_WRITE_TOKEN` no `back-end/.env` e no projeto **backend** da Vercel.
O ID tem o formato `store_...`. O token pertence a esse mesmo store e nunca
deve usar o prefixo `VITE_` nem ser enviado ao frontend. Após configurar as
variáveis em produção, publique novamente o backend e o frontend atualizado.

O upload autenticado em `POST /event/image/upload` aceita JPG/PNG de até
**4 MB**, valida a assinatura do arquivo e o salva em `event-images/` no Blob.
O limite fica abaixo dos [4,5 MB das funções da Vercel](https://vercel.com/docs/functions/limitations).
A resposta contém `{ "url": "https://...private.blob.vercel-storage.com/..." }`.
Ao salvar o evento, essa URL é gravada em `events.bannerImage` e sincronizada
com `images.imageUrl` pela transação que já existe. O upload sozinho não cria
um evento nem um registro de imagem. Nenhuma nova migration SQL é necessária.

Como o store é privado, o frontend exibe essas URLs por meio de
`GET /event/image/file?pathname=event-images/...`. O backend busca o arquivo
com sua credencial e transmite a imagem. A leitura é pública para manter o
acesso dos visitantes aos eventos, mas só permite os caminhos de imagens
gerados pela aplicação que estejam vinculados a `events` ou `images` no
banco configurado. Outros objetos do store não são expostos por essa rota.
O cache do navegador é revalidado com ETag, usando `private, no-cache`.
Consulte a [documentação de armazenamento privado](https://vercel.com/docs/vercel-blob/private-storage).

Novos uploads não dependem do disco local. Links externos continuam aceitos;
imagens antigas em `/uploads` precisam ser reenviadas pelo painel para serem
copiadas ao Blob e terem suas URLs atualizadas. A rota local foi mantida para
compatibilidade durante essa transição. Excluir ou substituir um vínculo no
banco não remove automaticamente o arquivo do Blob; uploads abandonados
também permanecem no store.

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
| `POST /admin/register/force` | IP e e-mail | 5 em cada bucket |
| `POST /message/create` | IP | 10 |
| `POST /admin/refresh` e `/admin/logout` | `adminId` do refresh JWT válido; IP se ausente/inválido | 30 |
| Acesso a rotas protegidas com credenciais ausentes/inválidas | IP | 60 |

O login permite um pico inicial de 5 tentativas e repõe **1 tentativa a cada
3 minutos**, até acumular 5. Isso não representa um máximo rígido de 5 em qualquer
janela de 15 minutos. Tentativas bem-sucedidas e malsucedidas consomem tokens.
E-mails têm espaços externos removidos e são convertidos para minúsculas apenas
para identificar o bucket. IPv4 mapeado em IPv6 é normalizado; endereços IPv6 da
mesma sub-rede `/64` compartilham a cota. A API ainda não possui recuperação de
senha: quando essa rota for criada, aplique uma política crítica própria.

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
