import { Link, useNavigate, useRouter } from "@tanstack/react-router";
import { Sparkles, LayoutGrid, LogOut, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const router = useRouter();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.invalidate();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-subtle">
      <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-8">
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-md bg-accent-gradient text-primary-foreground">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="font-medium tracking-tight">
                Vanguarda<span className="text-primary"> Builder</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex">
              <Link
                to="/dashboard"
                activeProps={{ className: "bg-accent text-foreground" }}
                className="inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-ink-soft hover:text-foreground"
              >
                <LayoutGrid className="h-4 w-4" /> Projetos
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" /> Nova página
              </Button>
            </Link>
            <Button size="sm" variant="ghost" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10">{children}</main>
    </div>
  );
}
