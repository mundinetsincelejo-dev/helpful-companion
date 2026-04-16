import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { statusLabels, priorityLabels, serviceTypeLabels, type Ticket, type Client } from '@/lib/mock-data';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Search, Clock, Wrench, Loader2 } from 'lucide-react';
import { useTickets, useClients } from '@/hooks/use-tickets';

export const Route = createFileRoute('/_authenticated/historial')({
  component: HistorialPage,
  head: () => ({
    meta: [
      { title: 'Historial — ServiTech' },
      { name: 'description', content: 'Historial y trazabilidad de intervenciones técnicas' },
    ],
  }),
});

function HistorialPage() {
  const [search, setSearch] = useState('');
  const { user } = Route.useRouteContext();
  const { data: tickets = [], isLoading: loadingTickets } = useTickets(user.role === 'technician' ? user.id : undefined);
  const { data: clients = [], isLoading: loadingClients } = useClients();

  const isLoading = loadingTickets || loadingClients;

  const matchingClients = search.length > 1
    ? clients.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.company.toLowerCase().includes(search.toLowerCase())
      )
    : clients;

  const matchingTickets = search.length > 1
    ? tickets.filter(
        (t) =>
          t.clients?.name.toLowerCase().includes(search.toLowerCase()) ||
          t.clients?.company.toLowerCase().includes(search.toLowerCase()) ||
          t.equipment_model.toLowerCase().includes(search.toLowerCase()) ||
          t.serial_number.toLowerCase().includes(search.toLowerCase())
      )
    : tickets;

  const grouped = matchingClients.reduce<Record<string, { client: Client; tickets: Ticket[] }>>(
    (acc, client) => {
      const clientTickets = matchingTickets
        .filter((t) => t.client_id === client.id)
        .sort((a, b) => b.created_at.localeCompare(a.created_at));
      if (clientTickets.length > 0) {
        acc[client.id] = { client, tickets: clientTickets };
      }
      return acc;
    },
    {}
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, equipo o Nº serie..."
          className="pl-9"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {Object.values(grouped).length === 0 && (
        <p className="text-center text-muted-foreground py-12">Sin historial disponible</p>
      )}

      {Object.values(grouped).map(({ client, tickets: clientTickets }) => (
        <Card key={client.id}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              {client.name} — <span className="text-muted-foreground">{client.company}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clientTickets.map((t) => (
              <div key={t.id} className="rounded-lg border bg-muted/30 p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {t.equipment_model} · {t.serial_number}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <StatusBadge status={t.status} />
                    <PriorityBadge priority={t.priority} />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{t.description}</p>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(t.created_at).toLocaleDateString('es-CL')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Wrench className="h-3 w-3" />
                    {t.technicians?.name || 'No asignado'}
                  </span>
                  {t.resolution_time_hours != null && (
                    <span>Resolución: {t.resolution_time_hours} hrs</span>
                  )}
                </div>
                {t.ticket_parts.length > 0 && (
                  <div className="text-xs">
                    <span className="font-medium">Repuestos: </span>
                    {t.ticket_parts.map((p) => p.part_name).join(', ')}
                  </div>
                )}
                {t.resolution_notes && (
                  <div className="text-xs rounded bg-success/10 p-2 text-success">
                    {t.resolution_notes}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
