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

### Publicação na Vercel

Configure o frontend e o backend como projetos separados. No frontend, defina
`VITE_API_BASE_URL` com a URL pública estável do backend, sem barra final; essa
variável é incorporada durante o build, portanto publique novamente o frontend
depois de alterá-la. No backend, configure as variáveis do banco acima,
`FRONTEND_URL` com a origem exata do frontend (sem caminho ou barra final) e os
segredos JWT. A API precisa estar acessível publicamente pelo navegador: desative
a proteção de Deployment/Authentication para a implantação de produção ou use
um domínio de produção não protegido. Não use o URL de preview protegido.
No backend, mantenha o middleware de autenticação do Express em
`authMiddleware.ts`, não em `middleware.ts`: a Vercel reserva esse nome para o
middleware da própria plataforma.

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
requisições da API para `http://localhost:8080`.

## Comandos úteis

Execute os comandos do backend dentro de `back-end`:

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Inicia o backend em modo de desenvolvimento. |
| `npm run db:migrate:status` | Lista migrations aplicadas e pendentes. |
| `npm run db:migrate` | Aplica as migrations pendentes. |
| `npm run db:migrate:undo` | Reverte a migration aplicada mais recentemente. |
| `npx sequelize-cli migration:generate --name nome-da-alteracao` | Gera um arquivo para uma nova migration em `db/migrations`. |

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
