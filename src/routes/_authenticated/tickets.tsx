import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import {
  statusLabels, priorityLabels, serviceTypeLabels,
  type Ticket, type Client, type TicketStatus, type TicketPriority, type ServiceType,
} from '@/lib/mock-data';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, Search, Eye, Pencil, Trash2, Loader2 } from 'lucide-react';
import {
  useTickets, useClients, useTechnicians,
  useCreateTicket, useUpdateTicket, useDeleteTicket,
  type Technician,
} from '@/hooks/use-tickets';
import type { Database } from '@/integrations/supabase/types';

export const Route = createFileRoute('/_authenticated/tickets')({
  component: TicketsPage,
  head: () => ({
    meta: [
      { title: 'Tickets — ServiTech' },
      { name: 'description', content: 'Gestión de solicitudes de servicio técnico' },
    ],
  }),
});

function TicketsPage() {
  const { user } = Route.useRouteContext();
  const { data: tickets = [], isLoading: loadingTickets } = useTickets(user.role === 'technician' ? user.technicianId : undefined);
  const { data: clients = [], isLoading: loadingClients } = useClients();
  const { data: technicians = [], isLoading: loadingTechs } = useTechnicians();
  const deleteTicketMutation = useDeleteTicket();

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Ticket | null>(null);
  const [viewTicket, setViewTicket] = useState<Ticket | null>(null);

  const isLoading = loadingTickets || loadingClients || loadingTechs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = tickets.filter((t) => {
    const matchesSearch =
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.clients?.company.toLowerCase().includes(search.toLowerCase()) ||
      String(t.id).includes(search);
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openEdit = (t: Ticket) => { setEditing(t); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Buscar ticket, cliente..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {(Object.keys(statusLabels) as TicketStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {user.role === 'admin' && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo Ticket
          </Button>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar Ticket' : 'Crear Solicitud'}</DialogTitle>
          </DialogHeader>
          <TicketForm existing={editing} onClose={closeForm} clients={clients} technicians={technicians} userRole={user.role} />
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">ID</th>
                  <th className="px-4 py-3 font-medium">Título</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Cliente</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Tipo</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Prioridad</th>
                  <th className="hidden px-4 py-3 font-medium lg:table-cell">Técnico</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">#{t.id}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-medium">{t.title}</td>
                    <td className="hidden px-4 py-3 sm:table-cell text-muted-foreground">{t.clients?.company}</td>
                    <td className="hidden px-4 py-3 md:table-cell text-muted-foreground">{serviceTypeLabels[t.service_type]}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="hidden px-4 py-3 lg:table-cell"><PriorityBadge priority={t.priority} /></td>
                    <td className="hidden px-4 py-3 lg:table-cell text-muted-foreground">{t.technicians?.name}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewTicket(t)}><Eye className="h-4 w-4" /></Button>
                        {(user.role === 'admin' || (user.role === 'technician' && t.assigned_tech_id === user.id)) && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar ticket #{t.id}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Se eliminará permanentemente el ticket <strong>"{t.title}"</strong>. Esta acción no se puede deshacer.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteTicketMutation.mutate(t.id)}>Eliminar</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No se encontraron tickets</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!viewTicket} onOpenChange={(open) => !open && setViewTicket(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {viewTicket && <TicketDetail ticket={viewTicket} client={viewTicket.clients} tech={viewTicket.technicians} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Ticket Form ── */
function TicketForm({
  existing, onClose, clients, technicians, userRole,
}: {
  existing: Ticket | null;
  onClose: () => void;
  clients: Client[];
  technicians: Technician[];
  userRole: 'admin' | 'technician';
}) {
  const createTicketMutation = useCreateTicket();
  const updateTicketMutation = useUpdateTicket();

  const [form, setForm] = useState({
    client_id: existing?.client_id ?? '',
    title: existing?.title ?? '',
    description: existing?.description ?? '',
    service_type: existing?.service_type ?? ('' as ServiceType | ''),
    priority: existing?.priority ?? ('media' as TicketPriority),
    status: existing?.status ?? ('abierto' as TicketStatus),
    equipment_model: existing?.equipment_model ?? '',
    serial_number: existing?.serial_number ?? '',
    assigned_tech_id: existing?.assigned_tech_id ?? '',
    scheduled_date: existing?.scheduled_date ?? '',
    scheduled_time: existing?.scheduled_time ?? '',
    resolution_notes: existing?.resolution_notes ?? '',
  });

  const availableTechs = form.service_type
    ? technicians.filter((t) => t.active && t.specialties.includes(form.service_type as ServiceType))
    : [];

  const handleServiceTypeChange = (v: string) => {
    setForm((prev) => ({ ...prev, service_type: v as ServiceType, assigned_tech_id: '' }));
  };

  const handleSubmit = () => {
    if (!form.client_id || !form.title || !form.service_type || !form.assigned_tech_id) return;
    const payload = {
      ...form,
      service_type: form.service_type as ServiceType,
      assigned_tech_id: form.assigned_tech_id || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      resolution_notes: form.resolution_notes || null,
    };
    if (existing?.id) {
      updateTicketMutation.mutate({ id: existing.id, ticket: payload });
    } else {
      createTicketMutation.mutate(payload as Database['public']['Tables']['tickets']['Insert']);
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Cliente</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })}>
          <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name} — {c.company}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label>Título</Label>
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Descripción breve del problema" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Categoría del Problema</Label>
          <Select value={form.service_type} onValueChange={handleServiceTypeChange}>
            <SelectTrigger><SelectValue placeholder="Seleccionar categoría" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(serviceTypeLabels) as ServiceType[]).map((s) => (
                <SelectItem key={s} value={s}>{serviceTypeLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Asignar a Técnico</Label>
          {!form.service_type ? (
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
              Seleccione categoría primero
            </div>
          ) : availableTechs.length === 0 ? (
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
              Sin técnicos disponibles
            </div>
          ) : (
            <Select value={form.assigned_tech_id} onValueChange={(v) => setForm({ ...form, assigned_tech_id: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar técnico" /></SelectTrigger>
              <SelectContent>
                {availableTechs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Prioridad</Label>
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {existing ? (
          (userRole === 'admin' || form.status !== 'cerrado') ? (
            <div>
              <Label>Estado</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as TicketStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.keys(statusLabels) as TicketStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div>
              <Label>Estado</Label>
              <Input value={statusLabels[form.status]} readOnly className="bg-muted/50" />
            </div>
          )
        ) : (
          <div>
            <Label>Estado</Label>
            <Input value={statusLabels['abierto']} readOnly className="bg-muted/50" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Modelo Equipo</Label><Input value={form.equipment_model} onChange={(e) => setForm({ ...form, equipment_model: e.target.value })} /></div>
        <div><Label>Nº Serie</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Fecha Agendada</Label><Input type="date" value={form.scheduled_date ?? ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
        <div><Label>Hora</Label><Input type="time" value={form.scheduled_time ?? ''} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} /></div>
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalle del fallo o requerimiento" />
      </div>

      {existing && (
        <div>
          <Label>Notas de Resolución</Label>
          <Textarea rows={2} value={form.resolution_notes ?? ''} onChange={(e) => setForm({ ...form, resolution_notes: e.target.value })} placeholder="Notas del técnico" />
        </div>
      )}

      <Button className="w-full" onClick={handleSubmit}>
        {existing ? 'Guardar Cambios' : 'Crear Solicitud'}
      </Button>
    </div>
  );
}

/* ── Detail view ── */
function TicketDetail({ ticket, client, tech }: {
  ticket: Ticket;
  client: Client | null;
  tech: { id: string; name: string } | null;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">#{ticket.id}</span>
          {ticket.title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <InfoField label="Cliente" value={client?.name ?? ''} />
          <InfoField label="Empresa" value={client?.company ?? ''} />
          <InfoField label="Teléfono" value={client?.phone ?? ''} />
          <InfoField label="Email" value={client?.email ?? ''} />
          <InfoField label="Categoría" value={serviceTypeLabels[ticket.service_type]} />
          <InfoField label="Técnico" value={tech?.name ?? 'No asignado'} />
          <InfoField label="Equipo" value={ticket.equipment_model} />
          <InfoField label="Nº Serie" value={ticket.serial_number} />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
          <p className="text-foreground">{ticket.description}</p>
        </div>
        {ticket.resolution_notes && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Notas de Resolución</p>
            <p className="text-foreground">{ticket.resolution_notes}</p>
          </div>
        )}
        {ticket.scheduled_date && (
          <div className="flex gap-3">
            <InfoField label="Fecha Agendada" value={ticket.scheduled_date} />
            <InfoField label="Hora" value={ticket.scheduled_time || '-'} />
          </div>
        )}
        {ticket.resolution_time_hours != null && (
          <InfoField label="Tiempo Resolución" value={`${ticket.resolution_time_hours} hrs`} />
        )}
      </div>
    </>
  );
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
