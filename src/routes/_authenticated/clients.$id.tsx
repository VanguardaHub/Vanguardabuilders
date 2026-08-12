import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  ArrowLeft,
  ArrowUpRight,
  Trash2,
  Upload,
  X,
  Link2,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Music,
  FileText,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getClient } from "@/lib/clients.functions";
import {
  createLandingPage,
  deleteLandingPage,
} from "@/lib/landing-pages.functions";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  head: () => ({ meta: [{ title: "Cliente — Vanguarda Builder" }] }),
  component: ClientPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <AppShell>
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
          <h2 className="text-lg">Erro ao carregar cliente</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {error instanceof Error ? error.message : "Erro desconhecido"}
          </p>
          <Button
            className="mt-4"
            onClick={() => {
              reset();
              router.invalidate();
            }}
          >
            Tentar novamente
          </Button>
        </div>
      </AppShell>
    );
  },
  notFoundComponent: () => (
    <AppShell>
      <p className="text-ink-soft">Cliente não encontrado.</p>
    </AppShell>
  ),
});

function ClientPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getClient);
  const { data, isLoading } = useQuery({
    queryKey: ["client", id],
    queryFn: () => getFn({ data: { id } }),
  });

  return (
    <AppShell>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1 text-sm text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Todos os clientes
      </Link>

      {isLoading || !data ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 shrink-0 rounded-xl border border-border"
                style={{
                  background:
                    data.client.brand_primary && data.client.brand_secondary
                      ? `linear-gradient(135deg, ${data.client.brand_primary}, ${data.client.brand_secondary})`
                      : data.client.brand_primary ?? "var(--color-muted)",
                }}
                aria-hidden
              />
              <div>
                <h1 className="font-display text-4xl">{data.client.name}</h1>
                <p className="mt-1 text-ink-soft">
                  {data.pages.length} landing page(s) nesta pasta
                </p>
              </div>
            </div>
            <NewProjectDialog
              clientId={data.client.id}
              defaultPrimary={data.client.brand_primary ?? "#E11D2E"}
              defaultSecondary={data.client.brand_secondary ?? "#111111"}
            />
          </div>

          <div className="mt-10">
            {data.pages.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl">Nenhuma página ainda</h3>
                <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
                  Crie a primeira landing page deste cliente.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.pages.map((p) => (
                  <ProjectCard key={p.id} page={p} clientId={data.client.id} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AppShell>
  );
}

function ProjectCard({
  page,
  clientId,
}: {
  page: { id: string; title: string; status: string; updated_at: string };
  clientId: string;
}) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteLandingPage);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Projeto removido");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  const statusBadge =
    {
      draft: "bg-muted text-ink-soft",
      generating: "bg-primary/10 text-primary",
      ready: "bg-emerald-100 text-emerald-700",
      failed: "bg-destructive/10 text-destructive",
    }[page.status] ?? "bg-muted text-ink-soft";

  const statusLabel =
    { draft: "Rascunho", generating: "Gerando…", ready: "Pronta", failed: "Falhou" }[
      page.status
    ] ?? page.status;

  return (
    <div className="group rounded-xl border border-border bg-card p-6 transition hover:shadow-elegant">
      <div className="flex items-start justify-between">
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${statusBadge}`}>
          {statusLabel}
        </span>
        <button
          onClick={() => del.mutate(page.id)}
          className="opacity-0 transition group-hover:opacity-100"
          aria-label="Excluir"
        >
          <Trash2 className="h-4 w-4 text-ink-soft hover:text-destructive" />
        </button>
      </div>
      <h3 className="mt-4 text-xl">{page.title}</h3>
      <p className="mt-1 text-xs text-ink-soft">
        Atualizado em {new Date(page.updated_at).toLocaleDateString("pt-BR")}
      </p>
      <Link
        to="/projects/$id"
        params={{ id: page.id }}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        Abrir <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

// ---------- New project dialog (now scoped to a client) ----------

type Asset = {
  path: string;
  filename: string;
  mime: string;
  size: number;
  kind: "image" | "video" | "audio" | "pdf" | "doc" | "other";
};

const MAX_FILE_BYTES = 50 * 1024 * 1024;
const ACCEPT_TYPES =
  "image/*,video/*,audio/*,application/pdf,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md,.rtf,.gif";

function classifyKind(mime: string): Asset["kind"] {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (
    mime.includes("word") ||
    mime.includes("officedocument") ||
    mime === "text/plain" ||
    mime === "text/markdown" ||
    mime === "application/rtf"
  )
    return "doc";
  return "other";
}

function kindIcon(kind: Asset["kind"]) {
  if (kind === "image") return ImageIcon;
  if (kind === "video") return Film;
  if (kind === "audio") return Music;
  if (kind === "pdf" || kind === "doc") return FileText;
  return FileIcon;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function NewProjectDialog({
  clientId,
  defaultPrimary,
  defaultSecondary,
}: {
  clientId: string;
  defaultPrimary: string;
  defaultSecondary: string;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [briefing, setBriefing] = useState("");
  const [primary, setPrimary] = useState(defaultPrimary);
  const [secondary, setSecondary] = useState(defaultSecondary);
  const [referencesText, setReferencesText] = useState("");
  const [linksText, setLinksText] = useState("");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [vkbLink, setVkbLink] = useState("");
  const [vkbAsset, setVkbAsset] = useState<Asset | null>(null);
  const [vkbUploading, setVkbUploading] = useState(false);
  const [model, setModel] = useState<"gemini-flash" | "gemini-pro">(
    "gemini-flash",
  );

  const qc = useQueryClient();
  const createFn = useServerFn(createLandingPage);
  const create = useMutation({
    mutationFn: () => {
      const userLinks = linksText
        .split(/\s+/)
        .map((s) => s.trim())
        .filter((s) => /^https?:\/\//i.test(s));
      const vkb = vkbLink.trim();
      const allLinks = vkb && /^https?:\/\//i.test(vkb) ? [vkb, ...userLinks] : userLinks;
      const allAssets = vkbAsset ? [vkbAsset, ...assets] : assets;
      const vkbNote =
        vkb || vkbAsset
          ? `VKB (Verbal Knowledge Base) do cliente${
              vkb ? ` — link: ${vkb}` : ""
            }${vkbAsset ? ` — arquivo: ${vkbAsset.filename}` : ""}. Use como FONTE PRIMÁRIA de tom de voz, posicionamento, oferta e diferenciais.\n\n`
          : "";
      const refs = `${vkbNote}${referencesText}`.trim();
      return createFn({
        data: {
          title,
          briefing,
          clientId,
          brandPrimary: primary,
          brandSecondary: secondary,
          referencesText: refs || null,
          links: allLinks.length ? allLinks : null,
          assets: allAssets.length
            ? allAssets.map((a) => ({
                path: a.path,
                filename: a.filename,
                mime: a.mime,
                size: a.size,
              }))
            : null,
          model,
        },
      });
    },
    onSuccess: () => {
      toast.success("Página gerada!");
      qc.invalidateQueries({ queryKey: ["client", clientId] });
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setTitle("");
      setBriefing("");
      setReferencesText("");
      setLinksText("");
      setAssets([]);
      setVkbLink("");
      setVkbAsset(null);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro ao gerar"),
  });

  async function handleVkbUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > MAX_FILE_BYTES) {
      toast.error(`${f.name}: máximo 50MB`);
      return;
    }
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    setVkbUploading(true);
    try {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_");
      const path = `${uid}/vkb-${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage
        .from("project-materials")
        .upload(path, f, {
          contentType: f.type || "application/octet-stream",
          upsert: false,
        });
      if (error) {
        toast.error(`${f.name}: ${error.message}`);
        return;
      }
      // remove previous VKB file if any
      if (vkbAsset) {
        await supabase.storage
          .from("project-materials")
          .remove([vkbAsset.path])
          .catch(() => {});
      }
      const mime = f.type || "application/octet-stream";
      setVkbAsset({
        path,
        filename: f.name,
        mime,
        size: f.size,
        kind: classifyKind(mime),
      });
    } finally {
      setVkbUploading(false);
    }
  }

  async function removeVkbAsset() {
    if (!vkbAsset) return;
    const a = vkbAsset;
    setVkbAsset(null);
    await supabase.storage.from("project-materials").remove([a.path]).catch(() => {});
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) {
      toast.error("Sessão expirada. Entre novamente.");
      return;
    }
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > MAX_FILE_BYTES) {
          toast.error(`${f.name}: máximo 50MB`);
          continue;
        }
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${uid}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage
          .from("project-materials")
          .upload(path, f, {
            contentType: f.type || "application/octet-stream",
            upsert: false,
          });
        if (error) {
          toast.error(`${f.name}: ${error.message}`);
          continue;
        }
        const mime = f.type || "application/octet-stream";
        setAssets((prev) => [
          ...prev,
          { path, filename: f.name, mime, size: f.size, kind: classifyKind(mime) },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeAsset(a: Asset) {
    setAssets((prev) => prev.filter((x) => x.path !== a.path));
    await supabase.storage.from("project-materials").remove([a.path]).catch(() => {});
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Nova landing page
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Nova landing page</DialogTitle>
          <DialogDescription>
            Cole o briefing e adicione referências (textos, links, PDFs, docs,
            imagens, GIFs e vídeos) para a IA entender o direcionamento.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="t">Título do projeto</Label>
            <Input
              id="t"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Lançamento Ponta Negra"
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="b">Briefing</Label>
            <Textarea
              id="b"
              rows={6}
              value={briefing}
              onChange={(e) => setBriefing(e.target.value)}
              placeholder="Oferta, público, dores, prova social, CTA desejado…"
              className="mt-1.5"
            />
          </div>

          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
            <div>
              <h4 className="text-sm font-medium text-primary">
                Adicionar VKB (link ou PDF)
              </h4>
              <p className="text-xs text-ink-soft">
                Verbal Knowledge Base — a IA usa como fonte primária de tom de voz,
                posicionamento e oferta. Link ou PDF (um dos dois, ou ambos).
              </p>
            </div>
            <div>
              <Label htmlFor="vkbl" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Link do VKB
              </Label>
              <Input
                id="vkbl"
                value={vkbLink}
                onChange={(e) => setVkbLink(e.target.value)}
                placeholder="https://notion.so/... ou https://drive.google.com/..."
                className="mt-1.5 font-mono text-xs"
              />
            </div>
            <div>
              <Label className="flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" /> PDF do VKB
              </Label>
              {vkbAsset ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs">
                  <span className="flex items-center gap-2 truncate">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{vkbAsset.filename}</span>
                    <span className="text-ink-soft">({formatBytes(vkbAsset.size)})</span>
                  </span>
                  <button
                    type="button"
                    onClick={removeVkbAsset}
                    className="text-ink-soft hover:text-destructive"
                    aria-label="Remover VKB"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-1.5">
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-sm text-ink-soft transition hover:border-primary hover:text-primary">
                    {vkbUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" /> Inserir VKB (PDF)
                      </>
                    )}
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={handleVkbUpload}
                      disabled={vkbUploading}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
            <div>
              <h4 className="text-sm font-medium">Materiais de referência</h4>
              <p className="text-xs text-ink-soft">
                Quantos arquivos quiser: manuais de marca, ofertas, dados de CRM,
                fotos, GIFs, vídeos, áudios…
              </p>
            </div>

            <div>
              <Label htmlFor="ref">Textos de referência</Label>
              <Textarea
                id="ref"
                rows={4}
                value={referencesText}
                onChange={(e) => setReferencesText(e.target.value)}
                placeholder="Cole aqui trechos, posicionamento, tom de voz, depoimentos…"
                className="mt-1.5"
              />
            </div>

            <div>
              <Label htmlFor="lnk" className="flex items-center gap-1.5">
                <Link2 className="h-3.5 w-3.5" /> Links (um por linha)
              </Label>
              <Textarea
                id="lnk"
                rows={3}
                value={linksText}
                onChange={(e) => setLinksText(e.target.value)}
                placeholder={"https://site-do-cliente.com\nhttps://landing-de-referencia.com"}
                className="mt-1.5 font-mono text-xs"
              />
            </div>

            <div>
              <Label className="flex items-center gap-1.5">
                <Upload className="h-3.5 w-3.5" /> Arquivos (PDF, doc, imagem, GIF,
                vídeo, áudio — até 50MB cada)
              </Label>
              <div className="mt-1.5">
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border bg-background px-3 py-4 text-sm text-ink-soft transition hover:border-primary hover:text-primary">
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Selecionar arquivos
                    </>
                  )}
                  <input
                    type="file"
                    accept={ACCEPT_TYPES}
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    disabled={uploading}
                  />
                </label>
              </div>
              {assets.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {assets.map((a) => {
                    const Icon = kindIcon(a.kind);
                    return (
                      <li
                        key={a.path}
                        className="flex items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <Icon className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="truncate">{a.filename}</span>
                          <span className="text-ink-soft">({formatBytes(a.size)})</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAsset(a)}
                          className="text-ink-soft hover:text-destructive"
                          aria-label="Remover"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="model">Modelo de IA</Label>
            <select
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value as typeof model)}
              className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <optgroup label="Google Gemini">
                <option value="gemini-flash">Gemini Flash — rápido (padrão)</option>
                <option value="gemini-pro">Gemini Pro — qualidade máxima</option>
              </optgroup>
            </select>
            <p className="mt-1 text-xs text-ink-soft">
              Gemini lê imagens, GIFs e PDFs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p">Cor primária</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={primary}
                  onChange={(e) => setPrimary(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
                />
                <Input value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </div>
            </div>
            <div>
              <Label htmlFor="s">Cor secundária</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input
                  type="color"
                  value={secondary}
                  onChange={(e) => setSecondary(e.target.value)}
                  className="h-9 w-12 cursor-pointer rounded-md border border-input bg-background"
                />
                <Input value={secondary} onChange={(e) => setSecondary(e.target.value)} />
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || uploading || !title || briefing.length < 10}
            className="gap-1.5"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Gerar landing page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
