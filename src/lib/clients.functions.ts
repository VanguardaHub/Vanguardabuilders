import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const listClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: clients, error } = await context.supabase
      .from("clients")
      .select("id, name, brand_primary, brand_secondary, brand_font, notes, created_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);

    const { data: pages, error: pErr } = await context.supabase
      .from("landing_pages")
      .select("id, client_id, updated_at");
    if (pErr) throw new Error(pErr.message);

    const counts = new Map<string, { count: number; lastUpdated: string | null }>();
    for (const p of pages ?? []) {
      const key = p.client_id ?? "__unassigned__";
      const c = counts.get(key) ?? { count: 0, lastUpdated: null };
      c.count += 1;
      if (!c.lastUpdated || p.updated_at > c.lastUpdated) c.lastUpdated = p.updated_at;
      counts.set(key, c);
    }

    return {
      clients: (clients ?? []).map((c) => ({
        ...c,
        pageCount: counts.get(c.id)?.count ?? 0,
        lastUpdated: counts.get(c.id)?.lastUpdated ?? null,
      })),
      unassigned: counts.get("__unassigned__") ?? { count: 0, lastUpdated: null },
    };
  });

export const getClient = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: client, error } = await context.supabase
      .from("clients")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!client) throw new Error("Cliente não encontrado");

    const { data: pages, error: pErr } = await context.supabase
      .from("landing_pages")
      .select("id, title, status, created_at, updated_at")
      .eq("client_id", data.id)
      .order("updated_at", { ascending: false });
    if (pErr) throw new Error(pErr.message);

    return { client, pages: pages ?? [] };
  });

const CreateClientInput = z.object({
  name: z.string().min(1).max(120),
  brandPrimary: z.string().max(20).optional().nullable(),
  brandSecondary: z.string().max(20).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export const createClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CreateClientInput.parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("clients")
      .insert({
        user_id: context.userId,
        name: data.name,
        brand_primary: data.brandPrimary ?? null,
        brand_secondary: data.brandSecondary ?? null,
        notes: data.notes ?? null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("clients").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
