import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "create_client",
  title: "Criar cliente",
  description: "Cria um novo cliente (pasta de projetos) para a agência.",
  inputSchema: {
    name: z.string().trim().min(1).describe("Nome do cliente."),
    brand_primary: z.string().trim().optional().describe("Cor primária da marca (hex)."),
    brand_secondary: z.string().trim().optional().describe("Cor secundária da marca (hex)."),
    notes: z.string().trim().optional().describe("Observações sobre o cliente."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ name, brand_primary, brand_secondary, notes }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("clients")
      .insert({
        user_id: ctx.getUserId()!,
        name,
        brand_primary: brand_primary ?? null,
        brand_secondary: brand_secondary ?? null,
        notes: notes ?? null,
      })
      .select("id, name, brand_primary, brand_secondary, notes")
      .single();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { client: data },
    };
  },
});
