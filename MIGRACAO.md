# Migração de infraestrutura — Vanguarda Builder

**De:** Hospedagem Lovable + Supabase gerenciado (Lovable Cloud)
**Para:** Vercel (frontend/SSR) + Supabase próprio (org `jussaracavalcante-sketch's Org`, `loqttoauenrycokebmrl`, região `sa-east-1`)

Branch de trabalho: `claude/migracao-supabase-vercel`
Data: 2026-08-10

---

## 1. O que foi inspecionado (e divergências importantes do plano original)

O plano inicial presumia um **Vite SPA clássico** (React + Vite + Tailwind/shadcn + `@supabase/supabase-js`, deploy estático com rewrite para `/index.html`). **A realidade do repositório é diferente** e o plano foi adaptado ao que existe de fato:

| Item | Plano presumia | Realidade encontrada | Impacto |
|------|----------------|----------------------|---------|
| Framework | Vite SPA (estático) | **TanStack Start (SSR) + nitro** (`name: "tanstack_start_ts"`, `@tanstack/react-start`, `@tanstack/react-router`) | O rewrite `/(.*) → /index.html` e `outputDirectory: dist` **quebrariam** o app. Não existe `index.html`. |
| Client Supabase | Precisava ser trocado para ler de env | `src/integrations/supabase/client.ts` **já lê** de `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` (com fallback SSR para `process.env`) | Passo 2 essencialmente **já feito**. Nenhuma edição necessária. |
| `vite.config.ts` | Continha `react()` + `componentTagger()` num array de plugins | Usa `@lovable.dev/vite-tanstack-config`, que **já inclui** o `componentTagger` só em dev. Não há array manual. | Passo 3 **não se aplica** como escrito — mexer quebraria (plugins duplicados). |
| Edge Functions | `supabase functions deploy` | **Não há `supabase/functions/`.** As "functions" são *server functions* do TanStack (`src/lib/*.functions.ts`, `*.server.ts`) que rodam no runtime SSR (Cloudflare/Vercel). | Não há Edge Functions Supabase para deployar. |
| Migrations | Talvez existam | **Existem 8 migrations** em `supabase/migrations/` + `supabase/config.toml`. | Workflow de migrations **se aplica**. |
| HubSpot / RD Station / Pipedrive | Integrações com segredos a recriar | Aparecem **apenas como texto de marketing** na landing (`src/routes/index.tsx`). **Não há integração real nem segredos** desses no código. | Nada a migrar aqui. |
| IA | Chaves OpenAI etc. | Única integração: **Lovable AI Gateway** (`https://ai.gateway.lovable.dev/v1`) via `LOVABLE_API_KEY` (`src/lib/ai-gateway.server.ts`) | Dependência do Lovable — **decisão necessária** (ver abaixo). |
| Código-fonte | Versionado no repo | **`src/` e `supabase/` NÃO estão versionados** — só existem dentro de `VanguardaBuilder.zip`. O topo do repo tem apenas 14 arquivos de config (idênticos aos do zip). | **A Vercel não consegue buildar** enquanto o código estiver só no zip. Ver seção 4. |

### Variáveis de ambiente realmente usadas pelo código

- **Client (build-time, prefixo `VITE_`, embutidas no bundle):** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (e `VITE_SUPABASE_PROJECT_ID` por convenção Lovable).
- **Server (runtime, SEM `VITE_`):** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (segredo — bypassa RLS), `LOVABLE_API_KEY`.

---

## 2. O que foi feito nesta branch

- ✅ `vercel.json` na raiz — **adaptado para SSR/TanStack Start** (nitro preset `vercel`), **sem** o rewrite de SPA e **sem** `outputDirectory`. O nitro emite o Build Output API em `.vercel/output`, que a Vercel detecta automaticamente.
- ✅ `.env.example` documentando todas as variáveis reais (client + server) e deixando explícito que segredos **nunca** vão em `VITE_*`.
- ✅ `.gitignore` — adicionado `.env`, `.env.*` (com exceção de `.env.example`) e `.vercel`. `dist`/`.output`/`.nitro` já estavam ignorados.
- ✅ `.env` **removido do controle de versão** (`git rm --cached .env`) — continha `anon/publishable key` (pública) mas não deve ficar versionado.
- ✅ `.github/workflows/deploy-vercel.yml` — build + deploy via Vercel CLI (prod no `main`, preview em PR).
- ✅ `.github/workflows/supabase-migrations.yml` — `supabase link` + `supabase db push` a cada push que altere `supabase/migrations/`.
- ✅ `MIGRACAO.md` (este arquivo).

> O client Supabase (`client.ts`) e o `vite.config.ts` **não foram alterados** porque já estão corretos para a migração (ver tabela na seção 1).

---

## 3. Supabase próprio — tentativa de criação (BLOQUEADO por billing)

Foi tentada a criação do projeto via ferramentas Supabase (MCP):

- Org alvo: `jussaracavalcante-sketch's Org` (`loqttoauenrycokebmrl`) — acessível ✅
- Custo consultado: **US$ 0/mês** (free tier) ✅
- `create_project` (nome `vanguarda-builder`, região `sa-east-1`) → **❌ FALHOU**:

```
PaymentRequiredException: There are overdue invoices in the organization(s) VTech.
Head to the organization's invoices page to settle the invoices before creating a new project.
```

**Conforme instruído, não insisti.** Faturas em aberto na org **VTech** bloqueiam a criação de qualquer projeto novo na conta (mesmo o custo sendo $0 na org alvo). Tudo que depende do projeto novo fica pendente:

- ⛔ Recriar schema (`supabase db push` das migrations)
- ⛔ Capturar Project URL / ref / anon-publishable key
- ⛔ Storage e Auth
- ⛔ Secrets do runtime (`SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`)

---

## 4. O que falta / próximos passos manuais

### 4.1. Regularizar o billing (pré-requisito de tudo no Supabase)
Quitar as faturas em aberto da org **VTech** em https://supabase.com/dashboard/org/_/invoices. Sem isso não é possível criar o projeto.

### 4.2. Desempacotar o código-fonte no repositório
Hoje `src/` e `supabase/` só existem dentro de `VanguardaBuilder.zip`. Sem eles a Vercel não builda e o workflow de migrations não roda. Na raiz do repo:

```bash
unzip -o VanguardaBuilder.zip -d .
git add src supabase public .lovable
git rm VanguardaBuilder.zip   # opcional: o zip vira redundante após desempacotar
git commit -m "chore: desempacota código-fonte do VanguardaBuilder.zip"
```

> Tentei fazer isso automaticamente, mas a extração em massa foi barrada pela política de segurança do ambiente (sobrescreve arquivos versionados / `.env`). Precisa ser feito manualmente.

### 4.3. Criar o projeto Supabase (após 4.1)
Criar `vanguarda-builder` na org `loqttoauenrycokebmrl`, região `sa-east-1`. Capturar: **Project URL**, **ref**, **anon/publishable key**, **service_role key**, **senha do banco**.

### 4.4. Recriar schema, Storage e Auth
- Schema: com `supabase/` versionado, rodar `supabase link --project-ref <ref>` + `supabase db push` (as 8 migrations criam `profiles`, `clients`, `landing_pages`, RLS por `auth.uid()`, triggers e `handle_new_user`). O workflow `supabase-migrations.yml` automatiza isso.
- **Storage:** verificar no app se há upload (o plano cita upload); criar o(s) bucket(s) e as policies equivalentes no projeto novo. *(Não há definição de bucket nas migrations atuais — confirmar no painel de origem `kqdxfrzmtbiyvinrfexj`.)*
- **Auth:** configurar **Site URL** e **Redirect URLs** apontando para o domínio `*.vercel.app` (e domínio final). Reconfigurar provedores OAuth se usados. Atenção: o login hoje passa pelo **Lovable Cloud Auth** (`@lovable.dev/cloud-auth-js` em `src/integrations/lovable/index.ts`) — ao sair do Lovable isso precisa ser revisto/substituído por Supabase Auth direto.

### 4.5. Configurar variáveis na Vercel
Em Project Settings > Environment Variables (Production **e** Preview):
`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`.

### 4.6. Secrets do GitHub Actions (se usar os workflows)
- Vercel: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
- Supabase: `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `SUPABASE_DB_PASSWORD`.

### 4.7. Decisão sobre o AI Gateway (IA)
A geração de landing pages usa o **Lovable AI Gateway** (`LOVABLE_API_KEY`). Ao migrar para fora do Lovable, escolher:
- (a) manter uma `LOVABLE_API_KEY` válida, ou
- (b) trocar por um provider OpenAI-compatível direto (OpenAI/OpenRouter/etc.), ajustando `baseURL` e `headers` em `src/lib/ai-gateway.server.ts`.

### 4.8. Validar o preset de deploy SSR na Vercel
`vercel.json` define `SERVER_PRESET=vercel` / `NITRO_PRESET=vercel`. Como o `@lovable.dev/vite-tanstack-config` fixa Cloudflare como padrão do nitro, **fazer um build de verificação** (deploy de preview) e confirmar que o output vai para `.vercel/output`. Se o wrapper ignorar essas envs, pode ser necessário passar o preset via config do nitro.

---

## 5. Checklist de verificação (pós-deploy)

- [ ] Login e logout funcionando (revisar fluxo Lovable Auth → Supabase Auth)
- [ ] Refresh (F5) em rota interna (ex.: `/dashboard`) **não** dá 404 — SSR/roteamento OK
- [ ] Geração de landing page funciona (IA / AI Gateway respondendo)
- [ ] Upload no Storage funciona (se aplicável)
- [ ] Integrações HubSpot/RD Station — **N/A no código atual** (apenas texto de marketing); confirmar se há integração real fora do repo
- [ ] RLS por usuário: cada usuário só enxerga seus próprios `clients` / `landing_pages`
- [ ] Variáveis de ambiente presentes em Production e Preview na Vercel
- [ ] Site/Redirect URL do Supabase Auth apontando para o domínio `.vercel.app`
