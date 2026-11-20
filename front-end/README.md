# React + TypeScript + Vite

## Compatibilidade do rodapé

Os testes locais de compatibilidade usam Playwright com o build de produção e verificam Chromium,
Firefox e WebKit em larguras de 320, 390, 760, 768 e 1440 pixels, nos temas
claro e escuro. Confere dimensões dos botões, transbordamento, links legais
e erros de JavaScript. As fontes de teste ficam apenas no ambiente local, conforme
o `.gitignore` do projeto. Esses testes não substituem a conferência em aparelhos
Android e iOS reais. Ao alterar o rodapé, repita essa matriz antes de publicar.

Se os navegadores mostrarem links diferentes, compare primeiro o endereço
completo e recarregue a página: diferenças no conteúdo também podem indicar
versões publicadas distintas ou uma aba antiga. O layout atual usa “Menu Rápido”
e “Contato”; “Serviços & Links” pertence a uma versão anterior.

## Navegação

Os links internos usam caminhos sem `#`: `/`, `/sobre`, `/contato`, `/calendario`,
`/produtores`, `/evento/:id`, `/calculadora`, `/minha-conta`
e `/admin`. As seções administrativas usam `/admin/eventos`,
`/admin/informacoes`, `/admin/administradores` e `/admin/mensagens`.
Links antigos com `#` continuam abrindo o destino e são convertidos para `/`.
Os antigos links `/produtor/:slug` abrem a listagem de produtores, que agora inclui os produtos de cada um nos cards.

O arquivo `vercel.json` encaminha as rotas do frontend para `index.html`,
permitindo acesso direto e atualização da página. Outras hospedagens devem
aplicar o mesmo fallback de SPA, preservando arquivos estáticos e rotas da API.
No Vite, requisições de página em `/admin` usam esse fallback; as chamadas de
API continuam sendo encaminhadas ao backend pelo proxy.

## Backend API

Frontend API requests use the shared `apiFetch` helper in `src/services/api.ts`.
During Vite development, API routes are proxied to `http://localhost:8080` by
default. Set `VITE_API_PROXY_TARGET` in `.env.local` if the backend is hosted
elsewhere:

```env
VITE_API_PROXY_TARGET=http://localhost:<backend-port>
```

For a deployment where the frontend and backend use different origins, set
`VITE_API_BASE_URL` to the backend origin. When omitted, requests use the current
origin, which supports same-origin deployments. Feature-specific services such
as `src/services/eventService.ts` can use `apiFetch` for other backend endpoints
as well.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```

You can also install [eslint-plugin-react-x](https://npmx.dev/package/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://npmx.dev/package/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])

```
