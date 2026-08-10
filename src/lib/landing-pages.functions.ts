import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const AssetRef = z.object({
  path: z.string().min(1).max(500), // storage path in `project-materials` bucket
  filename: z.string().min(1).max(200),
  mime: z.string().min(1).max(120),
  size: z.number().int().nonnegative(),
});
export type AssetRefT = z.infer<typeof AssetRef>;

export const AI_MODELS = {
  "gemini-flash": { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (rápido)" },
  "gemini-pro": { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro (qualidade)" },
  "gpt-5": { id: "openai/gpt-5", label: "ChatGPT 5 (qualidade)" },
  "gpt-5-mini": { id: "openai/gpt-5-mini", label: "ChatGPT 5 Mini (rápido)" },
} as const;
export type AiModelKey = keyof typeof AI_MODELS;

const CreateInput = z.object({
  title: z.string().min(1).max(120),
  briefing: z.string().min(10).max(8000),
  clientId: z.string().uuid({ message: "Selecione um cliente" }),
  brandPrimary: z.string().optional().nullable(),
  brandSecondary: z.string().optional().nullable(),
  referencesText: z.string().max(20_000).optional().nullable(),
  links: z.array(z.string().url()).optional().nullable(),
  assets: z.array(AssetRef).optional().nullable(),
  model: z.enum(["gemini-flash", "gemini-pro", "gpt-5", "gpt-5-mini"]).optional(),
});


function classifyAsset(mime: string): "pdf" | "doc" | "image" | "video" | "audio" | "other" {
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

export const listLandingPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("landing_pages")
      .select("id, title, status, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getLandingPage = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("landing_pages")
      .select("*, client:clients!landing_pages_client_id_fkey(id, name, brand_primary, brand_secondary, brand_font, notes)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) throw new Error("Página não encontrada");
    return page;
  });

async function fetchLinkAsText(url: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "VanguardaBuilder/1.0" },
    });
    clearTimeout(t);
    if (!res.ok) return `[Falha ao ler ${url}: HTTP ${res.status}]`;
    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 8000);
    return `URL: ${url}\n${text}`;
  } catch (e) {
    return `[Erro ao buscar ${url}: ${e instanceof Error ? e.message : "desconhecido"}]`;
  }
}

export const createLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => CreateInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("landing_pages")
      .insert({
        user_id: context.userId,
        title: data.title,
        briefing: data.briefing,
        client_id: data.clientId,
        status: "generating",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      await context.supabase
        .from("landing_pages")
        .update({ status: "draft" })
        .eq("id", page.id);
      throw new Error("Chave de IA não configurada");
    }

    try {
      // Fetch all link references in parallel
      const linkTexts = data.links?.length
        ? await Promise.all(data.links.map(fetchLinkAsText))
        : [];

      // Classify assets and prepare signed URLs for media references
      const assets = data.assets ?? [];
      const classified = assets.map((a) => ({ ...a, kind: classifyAsset(a.mime) }));

      // Build short-lived signed URLs (1h) so the AI provider can fetch them
      const signedByPath = new Map<string, string>();
      await Promise.all(
        classified.map(async (a) => {
          const { data: signed } = await context.supabase.storage
            .from("project-materials")
            .createSignedUrl(a.path, 60 * 60 * 24 * 7);
          if (signed?.signedUrl) signedByPath.set(a.path, signed.signedUrl);
        }),
      );

      const embeddable = classified.filter(
        (a) => (a.kind === "image" || a.kind === "video") && signedByPath.get(a.path),
      );
      const mediaSummary = classified.length
        ? `\n\nMATERIAIS ENVIADOS (${classified.length}):\n${classified
            .map((a, i) => `${i + 1}. [${a.kind}] ${a.filename} (${a.mime})`)
            .join("\n")}\nObs: imagens, GIFs e PDFs estão anexados a esta mensagem. Vídeos e áudios estão referenciados pelo nome — use-os como contexto sobre a oferta e a marca.`
        : "";
      const embedBlock = embeddable.length
        ? `\n\nMÍDIA EMBUTÍVEL (use estas URLs direto em <img>/<video> no HTML):\n${embeddable
            .map((a) => `- ${a.kind.toUpperCase()} ${a.filename} → ${signedByPath.get(a.path)}`)
            .join("\n")}`
        : "";

      const systemPrompt = `Você é diretor de criação + dev front-end de uma agência. Gere uma landing page de alta conversão em português brasileiro, com 3 a 6 seções, copy objetiva, foco em benefício, prova social quando fizer sentido e CTA claro. Use TODO o material de referência (briefing, textos, links, PDFs, imagens, GIFs, vídeos) para tom, oferta e diferenciais. Aplique RIGOROSAMENTE as cores da marca informadas.

Responda EXCLUSIVAMENTE com um objeto JSON válido, sem markdown, no formato:
{
  "sections": [
    {"type":"hero|benefits|features|social_proof|faq|cta","headline":"...","subheadline":"...","bullets":["..."],"cta_label":"..."}
  ],
  "html": "<!doctype html><html lang=\\"pt-BR\\">...</html>"
}

REGRAS DO CAMPO html (OBRIGATÓRIO):
- Documento HTML completo, válido e auto-contido (uma única string).
- Use Tailwind via CDN: <script src=\\"https://cdn.tailwindcss.com\\"></script> no <head>.
- Importe Google Fonts no <head> (ex.: Inter + um display elegante) e aplique via <style>.
- Use as cores primária/secundária da marca em destaques, botões, gradientes e detalhes.
- Layout responsivo mobile-first, hierarquia tipográfica forte, espaçamento generoso, microcopy persuasiva.
- Implemente TODAS as seções do array \\"sections\\" na mesma ordem, com hero, benefícios, features/serviços, prova social (depoimentos/logos), FAQ e CTA final quando aplicável.
- Inclua header com logo textual do projeto + navegação âncora; footer com copyright.
- Inclua <title>, <meta name=\\"description\\"> e meta OG básicas.
- Se houver imagens/GIFs nas referências, use as URLs entregues em \\"MÍDIA EMBUTÍVEL\\" abaixo via <img src=...>.
- NÃO use frameworks JS, NÃO use lorem ipsum, NÃO deixe placeholders — escreva copy real baseada no briefing.`;

      const userContent: Array<Record<string, unknown>> = [];

      const briefingBlock = `BRIEFING DO PROJETO:
Título: ${data.title}
Marca primária (hex): ${data.brandPrimary ?? "não informado"}
Marca secundária (hex): ${data.brandSecondary ?? "não informado"}

${data.briefing}${
        data.referencesText
          ? `\n\nREFERÊNCIAS EM TEXTO:\n${data.referencesText}`
          : ""
      }${
        linkTexts.length
          ? `\n\nCONTEÚDO DOS LINKS DE REFERÊNCIA:\n${linkTexts.join("\n\n---\n\n")}`
          : ""
      }${mediaSummary}${embedBlock}`;

      userContent.push({ type: "text", text: briefingBlock });

      // Attach images & GIFs as image_url, PDFs/docs as file blocks via signed URL
      for (const a of classified) {
        const url = signedByPath.get(a.path);
        if (!url) continue;
        if (a.kind === "image") {
          userContent.push({ type: "image_url", image_url: { url } });
        } else if (a.kind === "pdf" || a.kind === "doc") {
          try {
            const r = await fetch(url);
            if (!r.ok) continue;
            const buf = new Uint8Array(await r.arrayBuffer());
            if (buf.byteLength > 15 * 1024 * 1024) continue; // skip >15MB
            let bin = "";
            const chunk = 0x8000;
            for (let i = 0; i < buf.length; i += chunk) {
              bin += String.fromCharCode.apply(
                null,
                Array.from(buf.subarray(i, i + chunk)),
              );
            }
            const b64 = btoa(bin);
            userContent.push({
              type: "file",
              file: {
                filename: a.filename,
                file_data: `data:${a.mime};base64,${b64}`,
              },
            });
          } catch {
            // ignore individual file failures
          }
        }
      }

      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": key,
        },
        body: JSON.stringify({
          model: AI_MODELS[data.model ?? "gemini-flash"].id,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
      });


      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`IA retornou ${res.status}: ${errText.slice(0, 300)}`);
      }
      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content ?? "";
      const parsed = JSON.parse(content);

      const SectionsSchema = z.object({
        sections: z
          .array(
            z.object({
              type: z.enum(["hero", "benefits", "features", "social_proof", "faq", "cta"]),
              headline: z.string(),
              subheadline: z.string().optional(),
              bullets: z.array(z.string()).optional(),
              cta_label: z.string().optional(),
            }),
          )
          .min(1)
          .max(8),
        html: z.string().min(200),
      });
      const validated = SectionsSchema.parse(parsed);

      const { data: updated, error: upErr } = await context.supabase
        .from("landing_pages")
        .update({
          sections: validated.sections,
          html_output: validated.html,
          status: "ready",
          assets: assets,
        })
        .eq("id", page.id)
        .select()
        .single();
      if (upErr) throw new Error(upErr.message);
      return updated;
    } catch (err) {
      await context.supabase
        .from("landing_pages")
        .update({ status: "failed" })
        .eq("id", page.id);
      throw err;
    }
  });

export const deleteLandingPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("landing_pages")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const regenerateLandingPageHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("landing_pages")
      .select("*, client:clients!landing_pages_client_id_fkey(name, brand_primary, brand_secondary, brand_font, notes)")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) throw new Error("Página não encontrada");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Chave de IA não configurada");

    const c = (page.client ?? {}) as {
      name?: string | null;
      brand_primary?: string | null;
      brand_secondary?: string | null;
      brand_font?: string | null;
      notes?: string | null;
    };
    const sections = Array.isArray(page.sections) ? page.sections : [];

    const systemPrompt = `Você é dev front-end sênior. Gere UMA landing page HTML completa, auto-contida, mobile-first, usando Tailwind via CDN (<script src="https://cdn.tailwindcss.com"></script>), Google Fonts no <head>, e as cores da marca abaixo. Inclua header, footer e implemente EXATAMENTE as seções fornecidas, na ordem. Copy real (sem lorem). Responda APENAS com JSON: {"html":"<!doctype html>..."} sem markdown.`;

    const userPayload = JSON.stringify({
      title: page.title,
      cliente: c.name ?? null,
      cor_primaria: c.brand_primary ?? null,
      cor_secundaria: c.brand_secondary ?? null,
      tipografia: c.brand_font ?? null,
      notas_marca: c.notes ?? null,
      briefing: page.briefing ?? null,
      sections,
    });

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: AI_MODELS["gemini-flash"].id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`IA retornou ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = z.object({ html: z.string().min(200) }).parse(JSON.parse(content));

    const { data: updated, error: upErr } = await context.supabase
      .from("landing_pages")
      .update({ html_output: parsed.html, status: "ready" })
      .eq("id", page.id)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated;
  });

const EditInput = z.object({
  id: z.string().uuid(),
  instruction: z.string().min(3).max(4000),
  assets: z.array(AssetRef).optional().nullable(),
  model: z.enum(["gemini-flash", "gemini-pro", "gpt-5", "gpt-5-mini"]).optional(),
});

export const editLandingPageWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => EditInput.parse(data))
  .handler(async ({ data, context }) => {
    const { data: page, error } = await context.supabase
      .from("landing_pages")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!page) throw new Error("Página não encontrada");
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Chave de IA não configurada");

    const currentHtml = (page.html_output as string | null) ?? "";
    if (!currentHtml) throw new Error("Gere a landing page antes de editar.");

    const newAssets = data.assets ?? [];
    const classified = newAssets.map((a) => ({ ...a, kind: classifyAsset(a.mime) }));
    const signedByPath = new Map<string, string>();
    await Promise.all(
      classified.map(async (a) => {
        const { data: signed } = await context.supabase.storage
          .from("project-materials")
          .createSignedUrl(a.path, 60 * 60 * 24 * 7);
        if (signed?.signedUrl) signedByPath.set(a.path, signed.signedUrl);
      }),
    );
    const embeddable = classified.filter(
      (a) => (a.kind === "image" || a.kind === "video") && signedByPath.get(a.path),
    );
    const embedBlock = embeddable.length
      ? `\n\nNOVA MÍDIA DISPONÍVEL (use estas URLs em <img>/<video> se a instrução pedir):\n${embeddable
          .map((a) => `- ${a.kind.toUpperCase()} ${a.filename} → ${signedByPath.get(a.path)}`)
          .join("\n")}`
      : "";

    const systemPrompt = `Você é dev front-end sênior editando uma landing page existente. Receba o HTML atual e uma instrução de ajuste. Retorne o HTML COMPLETO atualizado (documento HTML inteiro, auto-contido, Tailwind via CDN, Google Fonts, responsivo). Preserve tudo que não foi pedido para mudar. Aplique a instrução com precisão. Responda APENAS com JSON: {"html":"<!doctype html>..."} sem markdown.`;

    const userContent: Array<Record<string, unknown>> = [
      {
        type: "text",
        text: `INSTRUÇÃO DE AJUSTE:\n${data.instruction}${embedBlock}\n\nHTML ATUAL (mantenha estrutura e edite conforme a instrução):\n\n${currentHtml}`,
      },
    ];
    for (const a of classified) {
      const url = signedByPath.get(a.path);
      if (!url) continue;
      if (a.kind === "image") userContent.push({ type: "image_url", image_url: { url } });
    }

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({
        model: AI_MODELS[data.model ?? "gemini-flash"].id,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`IA retornou ${res.status}: ${t.slice(0, 300)}`);
    }
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content ?? "";
    const parsed = z.object({ html: z.string().min(200) }).parse(JSON.parse(content));

    const mergedAssets = [
      ...((page.assets as AssetRefT[] | null) ?? []),
      ...newAssets,
    ];
    const { data: updated, error: upErr } = await context.supabase
      .from("landing_pages")
      .update({ html_output: parsed.html, assets: mergedAssets, status: "ready" })
      .eq("id", page.id)
      .select()
      .single();
    if (upErr) throw new Error(upErr.message);
    return updated;
  });

export const updateLandingPageHtml = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ id: z.string().uuid(), html: z.string().min(50).max(500_000) }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("landing_pages")
      .update({ html_output: data.html, status: "ready" })
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });
