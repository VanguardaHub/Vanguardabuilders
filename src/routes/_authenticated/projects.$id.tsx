import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowLeft,
  Loader2,
  Download,
  Sparkles,
  Eye,
  Code2,
  Wand2,
  Upload,
  X,
  Image as ImageIcon,
  Film,
  File as FileIcon,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  getLandingPage,
  regenerateLandingPageHtml,
  editLandingPageWithAI,
  updateLandingPageHtml,
  AI_MODELS,
  type AssetRefT,
} from "@/lib/landing-pages.functions";

export const Route = createFileRoute("/_authenticated/projects/$id")({
  head: () => ({ meta: [{ title: "Projeto — Vanguarda Builder" }] }),
  component: ProjectPage,
});

type Asset = AssetRefT & { kind: "pdf" | "doc" | "image" | "video" | "audio" | "other" };
const MAX_FILE_BYTES = 50 * 1024 * 1024;

function classifyKind(mime: string): Asset["kind"] {
  if (mime === "application/pdf") return "pdf";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime.includes("word") || mime.includes("officedocument") || mime === "text/plain" || mime === "text/markdown")
    return "doc";
  return "other";
}

function ProjectPage() {
  const { id } = Route.useParams();
  const getFn = useServerFn(getLandingPage);
  const regenFn = useServerFn(regenerateLandingPageHtml);
  const editFn = useServerFn(editLandingPageWithAI);
  const saveFn = useServerFn(updateLandingPageHtml);
  const qc = useQueryClient();
  const [view, setView] = useState<"preview" | "code">("preview");

  const { data, isLoading } = useQuery({
    queryKey: ["landing-page", id],
    queryFn: () => getFn({ data: { id } }),
  });

  const [instruction, setInstruction] = useState("");
  const [model, setModel] = useState<keyof typeof AI_MODELS>("gemini-flash");
  const [newAssets, setNewAssets] = useState<Asset[]>([]);
  const [uploading, setUploading] = useState(false);
  const [draftHtml, setDraftHtml] = useState<string>("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDraftHtml((data?.html_output as string | null) ?? "");
    setDirty(false);
  }, [data?.html_output]);

  const regen = useMutation({
    mutationFn: () => regenFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Landing page gerada!");
      qc.invalidateQueries({ queryKey: ["landing-page", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const edit = useMutation({
    mutationFn: () =>
      editFn({
        data: {
          id,
          instruction,
          model,
          assets: newAssets.map(({ kind: _k, ...a }) => a),
        },
      }),
    onSuccess: () => {
      toast.success("Ajustes aplicados!");
      setInstruction("");
      setNewAssets([]);
      qc.invalidateQueries({ queryKey: ["landing-page", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = useMutation({
    mutationFn: () => saveFn({ data: { id, html: draftHtml } }),
    onSuccess: () => {
      toast.success("HTML salvo");
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["landing-page", id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user?.id;
    if (!uid) return toast.error("Sessão expirada.");
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > MAX_FILE_BYTES) {
          toast.error(`${f.name}: máximo 50MB`);
          continue;
        }
        const safeName = f.name.replace(/[^\w.\-]+/g, "_");
        const path = `${uid}/edit-${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage
          .from("project-materials")
          .upload(path, f, { contentType: f.type || "application/octet-stream", upsert: false });
        if (error) {
          toast.error(`${f.name}: ${error.message}`);
          continue;
        }
        const mime = f.type || "application/octet-stream";
        setNewAssets((prev) => [
          ...prev,
          { path, filename: f.name, mime, size: f.size, kind: classifyKind(mime) },
        ]);
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeAsset(a: Asset) {
    setNewAssets((prev) => prev.filter((x) => x.path !== a.path));
    await supabase.storage.from("project-materials").remove([a.path]).catch(() => {});
  }

  function downloadHtml() {
    const html = draftHtml;
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(data?.title ?? "landing-page").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const html = draftHtml;
  const hasGenerated = Boolean((data?.html_output as string | null) ?? "");

  return (
    <AppShell>
      <Link
        to="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </Link>

      {isLoading || !data ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-ink-soft">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-display text-4xl">{data.title}</h1>
              <p className="mt-1 text-sm text-ink-soft">
                Status: <span className="text-foreground">{data.status}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex overflow-hidden rounded-md border border-border">
                <button
                  onClick={() => setView("preview")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                    view === "preview" ? "bg-foreground text-background" : "text-ink-soft hover:text-foreground"
                  }`}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </button>
                <button
                  onClick={() => setView("code")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs ${
                    view === "code" ? "bg-foreground text-background" : "text-ink-soft hover:text-foreground"
                  }`}
                >
                  <Code2 className="h-3.5 w-3.5" /> Editar HTML
                </button>
              </div>
              <Button
                variant="outline"
                className="gap-1.5"
                onClick={() => regen.mutate()}
                disabled={regen.isPending}
              >
                {regen.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {hasGenerated ? "Regenerar" : "Gerar HTML"}
              </Button>
              <Button className="gap-1.5" onClick={downloadHtml} disabled={!html}>
                <Download className="h-4 w-4" /> Baixar
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
            {/* PREVIEW / EDITOR */}
            <div>
              {html ? (
                view === "preview" ? (
                  <div className="overflow-hidden rounded-xl border border-border bg-white">
                    <iframe
                      title={`Preview ${data.title}`}
                      srcDoc={html}
                      sandbox="allow-scripts allow-same-origin"
                      className="h-[78vh] w-full"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-ink-soft">
                        Edite o HTML diretamente (como no Canva, mas em código)
                      </Label>
                      <Button
                        size="sm"
                        className="gap-1.5"
                        onClick={() => save.mutate()}
                        disabled={!dirty || save.isPending}
                      >
                        {save.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Salvar alterações
                      </Button>
                    </div>
                    <Textarea
                      value={draftHtml}
                      onChange={(e) => {
                        setDraftHtml(e.target.value);
                        setDirty(true);
                      }}
                      spellCheck={false}
                      className="h-[78vh] font-mono text-xs"
                    />
                  </div>
                )
              ) : (
                <div className="rounded-xl border border-dashed border-border p-10 text-center">
                  <p className="text-sm text-ink-soft">
                    Esta landing page ainda não tem HTML. Clique em "Gerar HTML".
                  </p>
                </div>
              )}
            </div>

            {/* AJUSTES COM IA */}
            <aside className="space-y-4 rounded-xl border border-border bg-card p-5">
              <div>
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" />
                  <h2 className="font-display text-lg">Ajustar com IA</h2>
                </div>
                <p className="mt-1 text-xs text-ink-soft">
                  Descreva o ajuste que a IA deve aplicar à landing page (textos, cores, seções, imagens…).
                </p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Comando</Label>
                <Textarea
                  rows={5}
                  placeholder="Ex.: troque o título do hero por 'Sua marca, em outro patamar', use a nova imagem como background do hero, deixe o CTA verde e adicione uma seção de FAQ com 4 perguntas."
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Modelo</Label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value as keyof typeof AI_MODELS)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                >
                  {Object.entries(AI_MODELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Novos arquivos (imagens, vídeos, GIFs, PDFs, docs)</Label>
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-xs text-ink-soft hover:bg-background">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Enviando…" : "Selecionar arquivos"}
                  <input
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUpload}
                    accept="image/*,video/*,audio/*,application/pdf,.doc,.docx,.txt,.md,.rtf,.ppt,.pptx,.xls,.xlsx"
                  />
                </label>
                {newAssets.length > 0 && (
                  <ul className="space-y-1.5">
                    {newAssets.map((a) => {
                      const Icon =
                        a.kind === "image" ? ImageIcon : a.kind === "video" ? Film : FileIcon;
                      return (
                        <li
                          key={a.path}
                          className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                        >
                          <Icon className="h-3.5 w-3.5 text-ink-soft" />
                          <span className="flex-1 truncate">{a.filename}</span>
                          <button
                            type="button"
                            onClick={() => removeAsset(a)}
                            className="text-ink-soft hover:text-destructive"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <Button
                className="w-full gap-1.5"
                onClick={() => edit.mutate()}
                disabled={!hasGenerated || edit.isPending || instruction.trim().length < 3}
              >
                {edit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                Aplicar ajuste
              </Button>

              {!hasGenerated && (
                <p className="text-xs text-ink-soft">
                  Gere a landing page primeiro para poder ajustá-la.
                </p>
              )}
            </aside>
          </div>
        </>
      )}
    </AppShell>
  );
}
