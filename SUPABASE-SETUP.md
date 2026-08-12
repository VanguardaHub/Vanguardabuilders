# Runbook — Supabase próprio (migração do backend)

Objetivo: sair do Supabase do Lovable Cloud (`kqdxfrzmtbiyvinrfexj`) e passar o backend para um projeto **próprio** na org `jussaracavalcante-sketch's Org` (`loqttoauenrycokebmrl`), região `sa-east-1`, nome `vanguarda-builder`.

> **Status (11/08/2026): projeto criado ✅.** Billing regularizado; passos 1–3 executados via ferramentas Supabase. Faltam os passos 4–5 (Google OAuth + envs na Vercel) e a verificação.
>
> **Projeto:** `vanguarda-builder` · **ref `ybfyhemmsmzofvmhphrn`** · região sa-east-1 · status ACTIVE_HEALTHY
> **Project URL:** `https://ybfyhemmsmzofvmhphrn.supabase.co`
> **Publishable key:** `sb_publishable_5Fdym3PcNtP_ot_sZLGPjA_NZ6YezLD` (anon legacy JWT também disponível)
> **service_role:** pegar no painel → Settings → API (segredo; nunca versionar/expor no client)
> Advisors de segurança: **0 alertas**.

## 1. Criar o projeto — ✅ FEITO
`vanguarda-builder` · org `loqttoauenrycokebmrl` · região `sa-east-1` · US$ 0/mês. Ref `ybfyhemmsmzofvmhphrn`.

## 2. Aplicar o schema — ✅ FEITO
As 8 migrations de `supabase/migrations/` foram aplicadas na ordem original (versões preservadas, então um `supabase db push` futuro as reconhece como já aplicadas). Criou: `profiles`, `clients`, `landing_pages` (3 tabelas, 11 policies), triggers `updated_at`/`handle_new_user`/`enforce_vanguarda_email`, e as 4 políticas de Storage.

## 3. Bucket de Storage `project-materials` — ✅ FEITO
Criado privado. As 4 políticas (isolando por pasta = `auth.uid()`) vieram da migration `20260625185746`.

## 4. Auth
- **Providers → Google:** habilitar e preencher Client ID / Secret (do Google Cloud Console).
- **URL Configuration:**
  - **Site URL:** `https://vanguardabuilders.vercel.app`
  - **Redirect URLs:** `https://vanguardabuilders.vercel.app/auth` (+ URLs de preview, se usar).
- **Google Cloud Console** (credenciais OAuth) → *Authorized redirect URI*: `https://<NOVO_REF>.supabase.co/auth/v1/callback`.
- Observação: o cadastro já é restrito a `@vanguardamartech.com.br` pelo trigger `enforce_vanguarda_email` (não precisa configurar nada extra para isso).

## 5. Apontar a Vercel para o projeto novo
Em Project Settings → Environment Variables (Production **e** Preview), trocar os valores para o projeto novo:
```
VITE_SUPABASE_URL=https://ybfyhemmsmzofvmhphrn.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_5Fdym3PcNtP_ot_sZLGPjA_NZ6YezLD
VITE_SUPABASE_PROJECT_ID=ybfyhemmsmzofvmhphrn
SUPABASE_URL=https://ybfyhemmsmzofvmhphrn.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_5Fdym3PcNtP_ot_sZLGPjA_NZ6YezLD
SUPABASE_SERVICE_ROLE_KEY=<pegar em Settings → API>   # segredo — nunca em VITE_
GEMINI_API_KEY=<chave do Google AI Studio>           # segredo — geração de landing pages via IA (tier grátis)
```
Depois: **Redeploy** na Vercel para reconstruir com as novas envs (as `VITE_*` são embutidas em build).

## 6. Dados existentes — ✅ migrados (2026-08-12)
Os dados do projeto Lovable de origem (`kqdxfrzmtbiyvinrfexj` / `7c58b586-...`) já foram trazidos para o projeto novo via MCP do Lovable:
- **auth.users** (2) + **auth.identities** (3, Google + email) — mesmos IDs, login preservado.
- **profiles** (2), **clients** (3), **landing_pages** (2, com HTML e assets).
- **storage** `project-materials` — 4 arquivos (3 PDFs + 1 logo), caminhos exatos preservados.

## 7. Verificação (go-live)
- [ ] Login e-mail/senha e Google (Google exige passo 4 completo)
- [ ] Refresh em rota interna sem 404
- [ ] Geração de landing page (IA responde)
- [ ] Upload no Storage (bucket `project-materials`)
- [ ] RLS: cada usuário só edita o que é seu; leitura compartilhada na agência

---

### Resumo do schema (referência)
| Objeto | Observação |
|--------|-----------|
| `public.profiles` | 1:1 com `auth.users`; criado no signup via `handle_new_user`. |
| `public.clients` | Cliente da agência; leitura da agência, escrita do dono. |
| `public.landing_pages` | Página gerada; `sections`/`assets` jsonb, `html_output`; FK para `clients`. |
| trigger `enforce_vanguarda_email` | Bloqueia cadastro fora de `@vanguardamartech.com.br`. |
| bucket `project-materials` | Privado; **criar manualmente** (passo 3). Políticas por pasta = `auth.uid()`. |
