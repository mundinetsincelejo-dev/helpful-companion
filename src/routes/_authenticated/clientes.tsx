import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/use-tickets';
import type { Client } from '@/lib/mock-data';

export const Route = createFileRoute('/_authenticated/clientes')({
  beforeLoad: ({ context }) => {
    if ((context as any).user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: ClientesPage,
  head: () => ({
    meta: [
      { title: 'Clientes — ServiTech' },
      { name: 'description', content: 'Gestión de clientes' },
    ],
  }),
});

function ClientesPage() {
  const { data: clients = [], isLoading } = useClients();
  const deleteClientMutation = useDeleteClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.company.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (c: Client) => { setEditing(c); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar cliente, empresa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Cliente' : 'Crear Cliente'}</DialogTitle>
            </DialogHeader>
            <ClientForm existing={editing} onClose={closeForm} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nombre</th>
                  <th className="px-4 py-3 font-medium">Empresa</th>
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Teléfono</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{c.company}</td>
                    <td className="hidden px-4 py-3 sm:table-cell text-muted-foreground">{c.email}</td>
                    <td className="hidden px-4 py-3 md:table-cell text-muted-foreground">{c.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará permanentemente a <strong>{c.name}</strong> ({c.company}).
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteClientMutation.mutate(c.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No se encontraron clientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ClientForm({ existing, onClose }: { existing: Client | null; onClose: () => void }) {
  const createClientMutation = useCreateClient();
  const updateClientMutation = useUpdateClient();
  const [form, setForm] = useState({
    name: existing?.name ?? '',
    company: existing?.company ?? '',
    email: existing?.email ?? '',
    phone: existing?.phone ?? '',
    address: existing?.address ?? '',
  });

  const handleSubmit = () => {
    if (!form.name || !form.company || !form.email) return;
    if (existing) {
      updateClientMutation.mutate({ id: existing.id, client: form });
    } else {
      createClientMutation.mutate(form);
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" /></div>
        <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Nombre de empresa" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
        <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div><Label>Dirección</Label><Textarea rows={2} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Dirección completa" /></div>
      <Button className="w-full" onClick={handleSubmit}>
        {existing ? 'Guardar Cambios' : 'Crear Cliente'}
      </Button>
    </div>
  );
}
