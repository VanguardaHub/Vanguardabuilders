# Runbook — Supabase próprio (migração do backend)

Objetivo: sair do Supabase do Lovable Cloud (`kqdxfrzmtbiyvinrfexj`) e passar o backend para um projeto **próprio** na org `jussaracavalcante-sketch's Org` (`loqttoauenrycokebmrl`), região `sa-east-1`, nome `vanguarda-builder`.

> **Status atual (10/08/2026):** a criação do projeto está **bloqueada** por `PaymentRequiredException` — faturas em aberto na org **VTech**. Nada abaixo pode rodar até isso ser quitado. Assim que o billing sair, posso executar os passos 1–4 via ferramentas Supabase (MCP) automaticamente; os passos 5–7 são no painel da Vercel / Supabase / Google.

## Pré-requisito
- [ ] Quitar as faturas da org **VTech** em `https://supabase.com/dashboard/org/_/invoices`.

## 1. Criar o projeto
`vanguarda-builder` · org `loqttoauenrycokebmrl` · região `sa-east-1` · custo US$ 0/mês (free tier).
Capturar após criar: **Project URL**, **ref**, **anon/publishable key**, **service_role key**, **senha do banco**.

## 2. Aplicar o schema (as 8 migrations de `supabase/migrations/`)
Duas opções — o resultado é o mesmo:

**a) Supabase CLI (recomendado):**
```bash
supabase link --project-ref <NOVO_REF>
supabase db push
```
**b) Via ferramentas MCP:** aplico cada migration na ordem cronológica (posso fazer isso por aqui assim que o projeto existir).

O schema cria: `profiles`, `clients`, `landing_pages`; RLS (leitura da agência, escrita do dono); triggers `updated_at`, `handle_new_user`, `enforce_vanguarda_email` (restringe cadastro a `@vanguardamartech.com.br`); e as **políticas de Storage** do bucket `project-materials`.

## 3. Criar o bucket de Storage (NÃO está nas migrations)
As políticas existem, mas o bucket precisa ser criado (privado). No SQL editor do projeto novo:
```sql
insert into storage.buckets (id, name, public)
values ('project-materials', 'project-materials', false)
on conflict (id) do nothing;
```
(As 4 políticas de `storage.objects` já vêm da migration `20260625185746`, isolando por pasta = `auth.uid()`.)

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
VITE_SUPABASE_URL=https://<NOVO_REF>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable do projeto novo>
VITE_SUPABASE_PROJECT_ID=<NOVO_REF>
SUPABASE_URL=https://<NOVO_REF>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon/publishable do projeto novo>
SUPABASE_SERVICE_ROLE_KEY=<service_role do projeto novo>   # segredo — nunca em VITE_
LOVABLE_API_KEY=<mantém, ou trocar pelo gateway de IA escolhido>
```
Depois: **Redeploy** na Vercel para reconstruir com as novas envs (as `VITE_*` são embutidas em build).

## 6. Dados existentes (opcional)
As migrations recriam apenas o **schema**, não os dados. Se quiser trazer clientes/páginas/usuários do projeto do Lovable (`kqdxfrzmtbiyvinrfexj`):
- Requer acesso ao banco de origem (credenciais do projeto Lovable).
- `pg_dump` (só dados: `--data-only --disable-triggers`) do origem → `psql`/restore no destino.
- Usuários (`auth.users`) exigem cuidado extra (migração de auth). Se o time for pequeno, pode ser mais simples recadastrar.

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
