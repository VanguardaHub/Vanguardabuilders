import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  validateSearch: (s: Record<string, unknown>): { next?: string } =>
    typeof s.next === "string" ? { next: s.next } : {},

  head: () => ({ meta: [{ title: "Entrar — Vanguarda Builder" }] }),
  component: AuthPage,
});

/** Only same-origin relative paths are accepted as a post-login target. */
function safeNext(next?: string) {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

function AuthPage() {
  const navigate = useNavigate();
  const { next } = Route.useSearch();
  const redirectTarget = safeNext(next);
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  function goAfterAuth() {
    if (redirectTarget) {
      window.location.href = redirectTarget;
      return;
    }
    navigate({ to: "/dashboard" });
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) return;
      // Valida o domínio corporativo — cobre também o retorno do OAuth do Google.
      const userEmail = data.session.user?.email ?? "";
      if (!isAllowedEmail(userEmail)) {
        await supabase.auth.signOut();
        toast.error(`Apenas e-mails ${ALLOWED_DOMAIN} têm acesso.`);
        return;
      }
      if (redirectTarget) window.location.href = redirectTarget;
      else navigate({ to: "/dashboard" });
    });
  }, [navigate, redirectTarget]);


  const ALLOWED_DOMAIN = "@vanguardamartech.com.br";

  function isAllowedEmail(value: string) {
    return value.trim().toLowerCase().endsWith(ALLOWED_DOMAIN);
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!isAllowedEmail(email)) {
      toast.error(`Use seu e-mail corporativo (${ALLOWED_DOMAIN}).`);
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name },
            emailRedirectTo: redirectTarget
              ? `${window.location.origin}${redirectTarget}`
              : window.location.origin,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu e-mail se necessário.");
        goAfterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        goAfterAuth();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao autenticar");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    // OAuth nativo do Supabase (substitui o Lovable Cloud Auth, cujo endpoint
    // /~oauth/initiate só existe na hospedagem do Lovable e dá 404 no Vercel).
    // Redireciona ao Google e volta para /auth, onde o useEffect valida o
    // domínio e encaminha. Requer o provider Google habilitado no projeto
    // Supabase e as Redirect URLs apontando para o domínio do app.
    const redirectTo = `${window.location.origin}/auth${
      redirectTarget ? `?next=${encodeURIComponent(redirectTarget)}` : ""
    }`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) {
      toast.error("Erro ao entrar com Google");
      setLoading(false);
    }
  }


  return (
    <div className="grid min-h-screen md:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden flex-col justify-between bg-hero p-12 text-primary-foreground md:flex">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="text-lg font-medium">
            Vanguarda<span className="text-primary"> Builder</span>
          </span>
        </Link>
        <div>
          <h2 className="font-display text-5xl leading-tight">
            Landing pages que convertem,
            <br />
            geradas pela <em className="text-primary not-italic">sua agência</em>.
          </h2>
          <p className="mt-4 max-w-md text-primary-foreground/70">
            Briefing → marca aplicada → CRM integrado → publicação. Tudo numa única
            plataforma feita para agências.
          </p>
        </div>
        <div className="text-sm text-primary-foreground/60">
          © Vanguarda Martech — Manaus, AM
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-lg font-medium">Vanguarda Builder</span>
          </div>
          <h1 className="font-display text-4xl">
            {mode === "signin" ? "Bem-vindo de volta" : "Crie sua conta"}
          </h1>
          <p className="mt-2 text-sm text-ink-soft">
            {mode === "signin"
              ? "Acesse seu painel e continue gerando páginas."
              : "Comece grátis. Sem cartão de crédito."}
          </p>

          <Button
            type="button"
            variant="outline"
            disabled={loading}
            onClick={handleGoogle}
            className="mt-6 w-full"
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.25 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
              />
            </svg>
            Continuar com Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs text-ink-soft">
            <div className="h-px flex-1 bg-border" /> ou e-mail <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleEmail} className="space-y-4">
            {mode === "signup" && (
              <div>
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome"
                  className="mt-1.5"
                />
              </div>
            )}
            <div>
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome.sobrenome@vanguardamartech.com.br"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-ink-soft">
                Acesso restrito a e-mails @vanguardamartech.com.br.
              </p>
            </div>


            <div>
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "signin" ? "Entrar" : "Criar conta"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-ink-soft">
            {mode === "signin" ? "Não tem conta?" : "Já tem conta?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Criar uma" : "Entrar"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
