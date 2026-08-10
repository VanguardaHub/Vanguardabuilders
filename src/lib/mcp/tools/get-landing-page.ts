import { defineTool, ToolError } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "get_landing_page",
  title: "Ver landing page",
  description: "Retorna briefing, seções e HTML gerado de uma landing page.",
  inputSchema: {
    id: z.string().uuid().describe("ID da landing page."),
    include_html: z
      .boolean()
      .optional()
      .describe("Incluir o HTML completo (pode ser longo). Padrão: true."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, include_html }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("landing_pages")
      .select("id, title, status, briefing, sections, html_output, client_id, updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) throw new ToolError("Landing page não encontrada.");
    const payload = {
      ...data,
      html_output: include_html === false ? undefined : data.html_output,
      html_length: data.html_output?.length ?? 0,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload) }],
      structuredContent: { page: payload },
    };
  },
});
