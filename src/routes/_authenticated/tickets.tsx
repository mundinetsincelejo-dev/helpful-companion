import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import {
  statusLabels, priorityLabels, serviceTypeLabels,
  type Ticket, type Client, type TicketStatus, type TicketPriority, type ServiceType,
} from '@/lib/mock-data';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
import { Plus, Search, Eye, Pencil, Trash2, Loader2, Wrench, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import {
  useTickets, useClients, useTechnicians,
  useCreateTicket, useUpdateTicket, useDeleteTicket,
  useTicketHistory, useTicketParts, useAddHistory, useAddPart,
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
  const { data: tickets = [], isLoading: loadingTickets } = useTickets(
    user.role === 'technician' ? user.technicianId : undefined
  );
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

  const canEditTicket = (t: Ticket) =>
    user.role === 'admin' ||
    (user.role === 'technician' && t.assigned_tech_id === user.technicianId);

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
          <TicketForm
            existing={editing}
            onClose={closeForm}
            clients={clients}
            technicians={technicians}
            userRole={user.role}
          />
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
                        {canEditTicket(t) && (
                          <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        )}
                        {user.role === 'admin' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar ticket #{t.id}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará el ticket <strong>"{t.title}"</strong>. Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteTicketMutation.mutate(t.id)}>Eliminar</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {viewTicket && (
            <TicketDetail
              ticket={viewTicket}
              technicians={technicians}
              userRole={user.role}
              userEmail={user.email}
              technicianId={user.technicianId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Ticket Form (create/edit) ── */
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
    if (!form.client_id || !form.title || !form.service_type || !form.assigned_tech_id) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    const payload = {
      ...form,
      service_type: form.service_type as ServiceType,
      assigned_tech_id: form.assigned_tech_id || null,
      scheduled_date: form.scheduled_date || null,
      scheduled_time: form.scheduled_time || null,
      resolution_notes: form.resolution_notes || null,
    };
    if (existing?.id) {
      updateTicketMutation.mutate(
        { id: existing.id, ticket: payload },
        { onSuccess: () => { toast.success('Ticket actualizado'); onClose(); } }
      );
    } else {
      createTicketMutation.mutate(
        payload as Database['public']['Tables']['tickets']['Insert'],
        { onSuccess: () => { toast.success('Ticket creado'); onClose(); } }
      );
    }
  };

  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-4">
      <div>
        <Label>Cliente</Label>
        <Select value={form.client_id} onValueChange={(v) => setForm({ ...form, client_id: v })} disabled={!isAdmin}>
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
        <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} disabled={!isAdmin} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Categoría</Label>
          <Select value={form.service_type} onValueChange={handleServiceTypeChange} disabled={!isAdmin}>
            <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
            <SelectContent>
              {(Object.keys(serviceTypeLabels) as ServiceType[]).map((s) => (
                <SelectItem key={s} value={s}>{serviceTypeLabels[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Técnico Asignado</Label>
          {!form.service_type ? (
            <div className="flex h-9 items-center rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground">
              Seleccione categoría
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
          <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v as TicketPriority })} disabled={!isAdmin}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(priorityLabels) as TicketPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{priorityLabels[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Modelo Equipo</Label><Input value={form.equipment_model} onChange={(e) => setForm({ ...form, equipment_model: e.target.value })} /></div>
        <div><Label>Nº Serie</Label><Input value={form.serial_number} onChange={(e) => setForm({ ...form, serial_number: e.target.value })} /></div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div><Label>Fecha</Label><Input type="date" value={form.scheduled_date ?? ''} onChange={(e) => setForm({ ...form, scheduled_date: e.target.value })} /></div>
        <div><Label>Hora</Label><Input type="time" value={form.scheduled_time ?? ''} onChange={(e) => setForm({ ...form, scheduled_time: e.target.value })} /></div>
      </div>

      <div>
        <Label>Descripción</Label>
        <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} disabled={!isAdmin} />
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

/* ── Ticket Detail (with management actions) ── */
function TicketDetail({
  ticket, technicians, userRole, userEmail, technicianId,
}: {
  ticket: Ticket;
  technicians: Technician[];
  userRole: 'admin' | 'technician';
  userEmail: string;
  technicianId?: string;
}) {
  const updateMutation = useUpdateTicket();
  const addHistory = useAddHistory();
  const addPart = useAddPart();
  const { data: history = [] } = useTicketHistory(ticket.id);
  const { data: parts = [] } = useTicketParts(ticket.id);

  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const [notes, setNotes] = useState(ticket.resolution_notes ?? '');
  const [reassignTo, setReassignTo] = useState(ticket.assigned_tech_id ?? '');
  const [newPart, setNewPart] = useState('');
  const [newAction, setNewAction] = useState('');
  const [newDetails, setNewDetails] = useState('');

  const canManage =
    userRole === 'admin' ||
    (userRole === 'technician' && ticket.assigned_tech_id === technicianId);

  const eligibleTechs = technicians.filter(
    (t) => t.active && t.specialties.includes(ticket.service_type)
  );

  const saveStatus = () => {
    if (status === ticket.status && notes === (ticket.resolution_notes ?? '')) {
      toast.info('Sin cambios');
      return;
    }
    const update: Database['public']['Tables']['tickets']['Update'] = {
      status,
      resolution_notes: notes || null,
    };
    if (status === 'cerrado' && !ticket.closed_at) {
      update.closed_at = new Date().toISOString();
    }
    updateMutation.mutate(
      { id: ticket.id, ticket: update },
      {
        onSuccess: () => {
          toast.success('Ticket actualizado');
          if (status !== ticket.status) {
            addHistory.mutate({
              ticket_id: ticket.id,
              action: `Cambio de estado: ${statusLabels[ticket.status]} → ${statusLabels[status]}`,
              performed_by: userEmail,
              details: notes || null,
            });
          }
        },
      }
    );
  };

  const reassign = () => {
    if (!reassignTo || reassignTo === ticket.assigned_tech_id) return;
    const newTech = technicians.find((t) => t.id === reassignTo);
    updateMutation.mutate(
      { id: ticket.id, ticket: { assigned_tech_id: reassignTo } },
      {
        onSuccess: () => {
          toast.success('Ticket reasignado');
          addHistory.mutate({
            ticket_id: ticket.id,
            action: `Reasignación: ${ticket.technicians?.name ?? 'sin asignar'} → ${newTech?.name ?? '?'}`,
            performed_by: userEmail,
          });
        },
      }
    );
  };

  const addPartHandler = () => {
    if (!newPart.trim()) return;
    addPart.mutate(
      { ticket_id: ticket.id, part_name: newPart.trim() },
      {
        onSuccess: () => {
          toast.success('Repuesto registrado');
          setNewPart('');
        },
      }
    );
  };

  const addHistoryEntry = () => {
    if (!newAction.trim()) return;
    addHistory.mutate(
      {
        ticket_id: ticket.id,
        action: newAction.trim(),
        performed_by: userEmail,
        details: newDetails.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success('Entrada registrada');
          setNewAction('');
          setNewDetails('');
        },
      }
    );
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span className="font-mono text-sm text-muted-foreground">#{ticket.id}</span>
          {ticket.title}
        </DialogTitle>
      </DialogHeader>
      <div className="space-y-5 text-sm">
        <div className="flex flex-wrap gap-2">
          <StatusBadge status={ticket.status} />
          <PriorityBadge priority={ticket.priority} />
          <Badge variant="outline">{serviceTypeLabels[ticket.service_type]}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoField label="Cliente" value={ticket.clients?.name ?? ''} />
          <InfoField label="Empresa" value={ticket.clients?.company ?? ''} />
          <InfoField label="Teléfono" value={ticket.clients?.phone ?? ''} />
          <InfoField label="Técnico actual" value={ticket.technicians?.name ?? 'Sin asignar'} />
          <InfoField label="Equipo" value={ticket.equipment_model || '-'} />
          <InfoField label="Nº Serie" value={ticket.serial_number || '-'} />
        </div>

        {ticket.description && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1">Descripción</p>
            <p>{ticket.description}</p>
          </div>
        )}

        {canManage && (
          <Card className="bg-muted/30">
            <CardContent className="space-y-3 p-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Gestión</p>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Cambiar Estado</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(statusLabels) as TicketStatus[]).map((s) => (
                        <SelectItem key={s} value={s}>{statusLabels[s]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button onClick={saveStatus} className="w-full" disabled={updateMutation.isPending}>
                    Guardar Estado
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs">Notas de Resolución</Label>
                <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Detalle del trabajo realizado..." />
              </div>

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <div>
                  <Label className="text-xs">Reasignar técnico</Label>
                  <Select value={reassignTo} onValueChange={setReassignTo}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {eligibleTechs.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button variant="outline" onClick={reassign} className="self-end">Reasignar</Button>
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5"><Wrench className="h-3 w-3" /> Repuestos utilizados</Label>
                <div className="flex gap-2">
                  <Input value={newPart} onChange={(e) => setNewPart(e.target.value)} placeholder="Ej: Cartucho HP 664" />
                  <Button variant="outline" onClick={addPartHandler}>Agregar</Button>
                </div>
                {parts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {parts.map((p) => (
                      <Badge key={p.id} variant="secondary" className="text-xs">{p.part_name}</Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <Label className="text-xs flex items-center gap-1.5"><ClipboardList className="h-3 w-3" /> Registrar intervención</Label>
                <Input value={newAction} onChange={(e) => setNewAction(e.target.value)} placeholder="Acción realizada" className="mb-2" />
                <div className="flex gap-2">
                  <Input value={newDetails} onChange={(e) => setNewDetails(e.target.value)} placeholder="Detalles (opcional)" />
                  <Button variant="outline" onClick={addHistoryEntry}>Registrar</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Historial de Intervenciones</p>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin entradas aún.</p>
          ) : (
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.id} className="rounded border-l-2 border-primary/50 bg-muted/30 px-3 py-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="font-medium">{h.action}</p>
                    <p className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(h.created_at).toLocaleString('es-CO')}
                    </p>
                  </div>
                  {h.details && <p className="text-xs text-muted-foreground mt-0.5">{h.details}</p>}
                  <p className="text-[10px] text-muted-foreground mt-1">por {h.performed_by || '-'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
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
