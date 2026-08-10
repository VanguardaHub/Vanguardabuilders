import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  FileText,
  Palette,
  Workflow,
  Zap,
  Code2,
  Check,
} from "lucide-react";
import vanguardaLogo from "@/assets/vanguarda-logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Vanguarda Builder — Landing pages com IA para agências" },
      {
        name: "description",
        content:
          "Plataforma para agências gerarem landing pages de até 5 seções a partir de briefings, identidade visual e CRM. Output para Lovable e WordPress.",
      },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: FileText,
    title: "Briefing como input",
    body: "Envie o documento do cliente em PDF, DOCX ou texto. A IA extrai promessa, dores, prova social e CTA.",
  },
  {
    icon: Palette,
    title: "Identidade visual respeitada",
    body: "Faça upload do manual da marca: cores, fontes e logo viram tokens aplicados em toda a página.",
  },
  {
    icon: Workflow,
    title: "CRM integrado",
    body: "Formulários conectados nativamente a HubSpot, RD Station e Pipedrive. Leads chegam no funil certo.",
  },
  {
    icon: Code2,
    title: "Export Lovable & WordPress",
    body: "Um clique para abrir no Lovable como projeto editável ou publicar em qualquer WordPress.",
  },
];

const steps = [
  { n: "01", t: "Cadastre o cliente", d: "Logo, paleta, fontes e tom de voz." },
  { n: "02", t: "Cole o briefing", d: "Texto livre, PDF ou DOCX." },
  { n: "03", t: "Gere com IA", d: "Até 5 seções otimizadas para conversão." },
  { n: "04", t: "Publique", d: "Lovable, WordPress ou link Vanguarda." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="fixed top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={vanguardaLogo.url}
              alt="Vanguarda Martech"
              className="h-9 w-auto"
            />
            <span className="ml-2 hidden text-sm font-medium tracking-tight text-ink-soft sm:inline">
              Builder
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-ink-soft md:flex">
            <a href="#recursos" className="hover:text-foreground">Recursos</a>
            <a href="#fluxo" className="hover:text-foreground">Como funciona</a>
            
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden rounded-md px-3 py-2 text-sm text-ink-soft hover:text-foreground sm:inline-flex"
            >
              Entrar
            </Link>
            <Link
              to="/auth"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
            >
              Começar <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 0%, oklch(0.58 0.215 24 / 0.35), transparent 50%), radial-gradient(circle at 80% 30%, oklch(0.22 0.05 25 / 0.3), transparent 50%)",
          }}
        />
        <div className="relative mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-3xl text-center"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-ink-soft">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Powered by Vanguarda Martech · Manaus
            </span>
            <h1 className="mt-6 text-balance text-5xl leading-[1.05] md:text-7xl">
              Landing pages prontas em <em className="text-primary not-italic">minutos</em>,
              <br />
              não em sprints.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-ink-soft">
              O builder de IA da Vanguarda transforma briefing, manual de marca e
              objetivo de campanha em uma landing page completa — exportável para
              Lovable, WordPress e integrada ao seu CRM.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow-glow transition hover:bg-primary/90"
              >
                Gerar minha primeira página <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#fluxo"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-6 py-3 text-sm font-medium text-foreground hover:bg-accent"
              >
                Ver como funciona
              </a>
            </div>
            <p className="mt-4 text-xs text-ink-soft">
              7 dias grátis · Sem cartão · Cancele quando quiser
            </p>
          </motion.div>

          {/* Mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mx-auto mt-16 max-w-5xl"
          >
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
              <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                <div className="flex gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground/30" />
                </div>
                <div className="ml-3 flex-1 rounded-md bg-muted px-3 py-1 text-xs text-ink-soft">
                  builder.vanguardamartech.com.br/projetos/novo
                </div>
              </div>
              <div className="grid gap-6 p-8 md:grid-cols-[1fr_1.4fr]">
                <div className="space-y-4">
                  <div className="text-xs uppercase tracking-wider text-ink-soft">Briefing</div>
                  <div className="rounded-md border border-border bg-muted/40 p-4 text-sm text-ink-soft">
                    Cliente: <span className="text-foreground">Imobiliária Norte</span>
                    <br />
                    Campanha: lançamento de empreendimento na Ponta Negra.
                    Público AB+, foco em conversão para visita.
                  </div>
                  <button className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground">
                    <Sparkles className="h-4 w-4" /> Gerar landing page
                  </button>
                </div>
                <div className="space-y-2 rounded-md bg-hero p-6 text-primary-foreground">
                  <div className="text-xs uppercase tracking-wider opacity-70">Preview</div>
                  <div className="font-display text-3xl leading-tight">
                    Seu novo endereço na Ponta Negra.
                  </div>
                  <div className="text-sm opacity-80">
                    Apartamentos de 2 e 3 dormitórios com vista para o rio.
                  </div>
                  <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary-foreground/10 px-3 py-1.5 text-xs">
                    <Check className="h-3 w-3" /> 5 seções geradas
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="recursos" className="border-t border-border bg-subtle py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <span className="text-xs uppercase tracking-wider text-primary">Recursos</span>
            <h2 className="mt-3 text-4xl md:text-5xl">
              Tudo que sua agência precisa para escalar entrega.
            </h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="bg-card p-8">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl">{f.title}</h3>
                <p className="mt-2 text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps */}
      <section id="fluxo" className="py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs uppercase tracking-wider text-primary">Fluxo</span>
            <h2 className="mt-3 text-4xl md:text-5xl">Do briefing ao no ar em 4 passos.</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-xl border border-border bg-card p-6"
              >
                <div className="font-display text-3xl text-primary">{s.n}</div>
                <div className="mt-2 text-lg font-medium">{s.t}</div>
                <div className="mt-1 text-sm text-ink-soft">{s.d}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="relative overflow-hidden rounded-3xl bg-hero p-12 text-center text-primary-foreground shadow-elegant md:p-16">
            <div
              aria-hidden
              className="absolute inset-0 opacity-30"
              style={{ backgroundImage: "radial-gradient(circle at 30% 20%, oklch(0.58 0.215 24 / 0.6), transparent 55%)" }}
            />
            <div className="relative">
              <Zap className="mx-auto h-8 w-8" />
              <h2 className="mt-4 text-balance text-4xl md:text-5xl">
                Sua próxima landing está a um briefing de distância.
              </h2>
              <Link
                to="/auth"
                className="mt-8 inline-flex items-center gap-2 rounded-md bg-primary-foreground px-6 py-3 text-sm font-medium text-ink transition hover:bg-primary-foreground/90"
              >
                Criar conta grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 text-sm text-ink-soft md:flex-row">
          <div>© {new Date().getFullYear()} Vanguarda Martech · Manaus, AM</div>
          <div className="flex gap-6">
            <a href="#">Termos</a>
            <a href="#">Privacidade</a>
            <a href="#">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
