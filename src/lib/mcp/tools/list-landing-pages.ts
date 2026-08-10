import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_landing_pages",
  title: "Listar landing pages",
  description: "Lista as landing pages, opcionalmente filtrando por cliente.",
  inputSchema: {
    client_id: z.string().uuid().optional().describe("Filtrar por ID do cliente."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ client_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("landing_pages")
      .select("id, title, status, client_id, created_at, updated_at")
      .order("updated_at", { ascending: false });
    if (client_id) query = query.eq("client_id", client_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? []) }],
      structuredContent: { pages: data ?? [] },
    };
  },
});
