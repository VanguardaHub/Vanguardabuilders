import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listClientsTool from "./tools/list-clients";
import createClientTool from "./tools/create-client";
import listLandingPagesTool from "./tools/list-landing-pages";
import getLandingPageTool from "./tools/get-landing-page";
import updateLandingPageHtmlTool from "./tools/update-landing-page-html";

const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "vanguardabuilder",
  title: "VanguardaBuilder",
  version: "0.1.0",
  instructions:
    "Ferramentas do VanguardaBuilder: gerencie clientes e landing pages da agência. Use list_clients e list_landing_pages para explorar, get_landing_page para ler briefing/seções/HTML e update_landing_page_html para salvar um novo HTML.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listClientsTool,
    createClientTool,
    listLandingPagesTool,
    getLandingPageTool,
    updateLandingPageHtmlTool,
  ],
});
