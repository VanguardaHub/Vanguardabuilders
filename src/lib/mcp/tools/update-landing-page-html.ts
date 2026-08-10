import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "update_landing_page_html",
  title: "Atualizar HTML da landing page",
  description: "Substitui o HTML de uma landing page existente pelo HTML informado.",
  inputSchema: {
    id: z.string().uuid().describe("ID da landing page."),
    html: z.string().describe("HTML completo e autocontido da página."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  handler: async ({ id, html }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    if (html.trim().length < 50) {
      return { content: [{ type: "text", text: "HTML muito curto." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("landing_pages")
      .update({ html_output: html, status: "ready" })
      .eq("id", id)
      .select("id, title, status, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Nada atualizado: página inexistente ou sem permissão." }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data) }],
      structuredContent: { page: data },
    };
  },
});
