import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  FolderOpen,
  ArrowUpRight,
  Trash2,
  Users,
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
import {
  listClients,
  createClient,
  deleteClient,
} from "@/lib/clients.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Clientes — Vanguarda Builder" }] }),
  component: Dashboard,
});

function Dashboard() {
  const listFn = useServerFn(listClients);
  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: () => listFn(),
  });

  const clients = data?.clients ?? [];
  const unassigned = data?.unassigned ?? { count: 0, lastUpdated: null };

  return (
    <AppShell>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Clientes</h1>
          <p className="mt-1 text-ink-soft">
            Cada cliente tem sua própria pasta de landing pages. Crie um cliente
            para começar.
          </p>
        </div>
        <NewClientDialog />
      </div>

      <div className="mt-10">
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </div>
        ) : clients.length === 0 && unassigned.count === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {clients.map((c) => (
              <ClientCard key={c.id} client={c} />
            ))}
            {unassigned.count > 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/50 p-6 text-sm text-ink-soft">
                <FolderOpen className="h-5 w-5 text-ink-soft" />
                <h3 className="mt-3 text-base text-ink">Sem cliente</h3>
                <p className="mt-1 text-xs">
                  {unassigned.count} página(s) criada(s) antes da organização por
                  cliente. Edite-as para associar a um cliente.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
        <Users className="h-5 w-5" />
      </div>
      <h3 className="mt-4 text-xl">Nenhum cliente ainda</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-ink-soft">
        Cadastre seu primeiro cliente. Cada cliente terá uma pasta exclusiva com
        todas as landing pages geradas para ele.
      </p>
      <div className="mt-6">
        <NewClientDialog />
      </div>
    </div>
  );
}

function ClientCard({
  client,
}: {
  client: {
    id: string;
    name: string;
    brand_primary: string | null;
    brand_secondary: string | null;
    pageCount: number;
    lastUpdated: string | null;
  };
}) {
  const qc = useQueryClient();
  const delFn = useServerFn(deleteClient);
  const del = useMutation({
    mutationFn: (id: string) => delFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Cliente removido");
      qc.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <div className="group relative rounded-xl border border-border bg-card p-6 transition hover:shadow-elegant">
      <button
        onClick={() => {
          if (confirm(`Remover cliente "${client.name}"? As páginas ficam sem cliente.`))
            del.mutate(client.id);
        }}
        className="absolute right-4 top-4 opacity-0 transition group-hover:opacity-100"
        aria-label="Excluir"
      >
        <Trash2 className="h-4 w-4 text-ink-soft hover:text-destructive" />
      </button>

      <div className="flex items-center gap-3">
        <div
          className="h-10 w-10 shrink-0 rounded-lg border border-border"
          style={{
            background:
              client.brand_primary && client.brand_secondary
                ? `linear-gradient(135deg, ${client.brand_primary}, ${client.brand_secondary})`
                : client.brand_primary ?? "var(--color-muted)",
          }}
          aria-hidden
        />
        <div className="min-w-0">
          <h3 className="truncate text-lg">{client.name}</h3>
          <p className="text-xs text-ink-soft">
            {client.pageCount} {client.pageCount === 1 ? "página" : "páginas"}
            {client.lastUpdated
              ? ` · atualizado ${new Date(client.lastUpdated).toLocaleDateString("pt-BR")}`
              : ""}
          </p>
        </div>
      </div>

      <Link
        to="/clients/$id"
        params={{ id: client.id }}
        className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary"
      >
        Abrir pasta <ArrowUpRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function NewClientDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [primary, setPrimary] = useState("#E11D2E");
  const [secondary, setSecondary] = useState("#111111");
  const [notes, setNotes] = useState("");

  const qc = useQueryClient();
  const createFn = useServerFn(createClient);
  const create = useMutation({
    mutationFn: () =>
      createFn({
        data: {
          name,
          brandPrimary: primary,
          brandSecondary: secondary,
          notes: notes || null,
        },
      }),
    onSuccess: () => {
      toast.success("Cliente criado");
      qc.invalidateQueries({ queryKey: ["clients"] });
      setOpen(false);
      setName("");
      setNotes("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Erro"),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-1.5">
          <Plus className="h-4 w-4" /> Novo cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Novo cliente</DialogTitle>
          <DialogDescription>
            Cadastre o cliente para organizar todas as landing pages dele em uma
            pasta dedicada.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="cn">Nome do cliente</Label>
            <Input
              id="cn"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Construtora Ponta Negra"
              className="mt-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cp">Cor primária da marca</Label>
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
              <Label htmlFor="cs">Cor secundária da marca</Label>
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
          <div>
            <Label htmlFor="cnotes">Notas (opcional)</Label>
            <Textarea
              id="cnotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tom de voz, posicionamento, observações…"
              className="mt-1.5"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={() => create.mutate()}
            disabled={create.isPending || !name.trim()}
            className="gap-1.5"
          >
            {create.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Criar cliente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
