import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Search, Pencil, Trash2, Loader2 } from 'lucide-react';
import { useTechnicians, useCreateTechnician, useUpdateTechnician, useDeleteTechnician, type Technician } from '@/hooks/use-tickets';
import { serviceTypeLabels, type ServiceType } from '@/lib/mock-data';

export const Route = createFileRoute('/_authenticated/tecnicos')({
  beforeLoad: ({ context }) => {
    if ((context as any).user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: TecnicosPage,
  head: () => ({
    meta: [
      { title: 'Técnicos — ServiTech' },
      { name: 'description', content: 'Gestión de técnicos de servicio' },
    ],
  }),
});

const allSpecialties = Object.keys(serviceTypeLabels) as ServiceType[];

function TecnicosPage() {
  const { data: technicians = [], isLoading } = useTechnicians();
  const deleteTechnicianMutation = useDeleteTechnician();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Technician | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleDelete = (id: string) => deleteTechnicianMutation.mutate(id);

  const filtered = technicians.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase())
  );

  const openEdit = (t: Technician) => { setEditing(t); setShowForm(true); };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar técnico..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={showForm} onOpenChange={(o) => !o && closeForm()}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo Técnico
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar Técnico' : 'Crear Técnico'}</DialogTitle>
            </DialogHeader>
            <TechnicianForm existing={editing} onClose={closeForm} />
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
                  <th className="hidden px-4 py-3 font-medium sm:table-cell">Email</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Teléfono</th>
                  <th className="px-4 py-3 font-medium">Especialidades</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="hidden px-4 py-3 sm:table-cell text-muted-foreground">{t.email}</td>
                    <td className="hidden px-4 py-3 md:table-cell text-muted-foreground">{t.phone}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {t.specialties.map((s) => (
                          <Badge key={s} variant="outline" className="text-[10px]">{serviceTypeLabels[s]}</Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={t.active ? 'default' : 'secondary'}>{t.active ? 'Activo' : 'Inactivo'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar técnico?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Se eliminará permanentemente a <strong>{t.name}</strong>.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(t.id)}>Eliminar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No se encontraron técnicos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TechnicianForm({ existing, onClose }: { existing: Technician | null; onClose: () => void }) {
  const createTechnicianMutation = useCreateTechnician();
  const updateTechnicianMutation = useUpdateTechnician();

  const [form, setForm] = useState({
    name: existing?.name ?? '',
    email: existing?.email ?? '',
    phone: existing?.phone ?? '',
    specialties: existing?.specialties ?? [] as ServiceType[],
    active: existing?.active ?? true,
  });

  const toggleSpecialty = (s: ServiceType) => {
    setForm((prev) => ({
      ...prev,
      specialties: prev.specialties.includes(s)
        ? prev.specialties.filter((x) => x !== s)
        : [...prev.specialties, s],
    }));
  };

  const handleSubmit = () => {
    if (!form.name || form.specialties.length === 0) return;
    if (existing) {
      updateTechnicianMutation.mutate({ id: existing.id, technician: form });
    } else {
      createTechnicianMutation.mutate(form);
    }
    onClose();
  };

  return (
    <div className="space-y-4">
      <div><Label>Nombre</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nombre completo" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" /></div>
        <div><Label>Teléfono</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
      </div>
      <div>
        <Label className="mb-2 block">Especialidades</Label>
        <div className="grid grid-cols-2 gap-2">
          {allSpecialties.map((s) => (
            <label key={s} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox checked={form.specialties.includes(s)} onCheckedChange={() => toggleSpecialty(s)} />
              {serviceTypeLabels[s]}
            </label>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm cursor-pointer">
        <Checkbox checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: !!v })} />
        Técnico activo
      </label>
      <Button className="w-full" onClick={handleSubmit}>
        {existing ? 'Guardar Cambios' : 'Crear Técnico'}
      </Button>
    </div>
  );
}
