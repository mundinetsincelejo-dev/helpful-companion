import { createFileRoute, redirect } from '@tanstack/react-router';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Search, KeyRound, Trash2, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';
import {
  listUsersFn, createUserFn, updateUserRoleFn, resetUserPasswordFn, deleteUserFn,
} from '@/utils/users.functions';
import { getAuthHeaders } from '@/utils/auth-headers';

const USERS_KEY = ['admin-users'];

export const Route = createFileRoute('/_authenticated/usuarios')({
  beforeLoad: ({ context }) => {
    if ((context as any).user.role !== 'admin') {
      throw redirect({ to: '/' });
    }
  },
  component: UsuariosPage,
  head: () => ({
    meta: [
      { title: 'Usuarios — ServiTech' },
      { name: 'description', content: 'Gestión de cuentas de usuario y roles del sistema' },
    ],
  }),
});

function UsuariosPage() {
  const { user } = Route.useRouteContext();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [resetUserId, setResetUserId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery({
    queryKey: USERS_KEY,
    queryFn: async () => listUsersFn({ headers: await getAuthHeaders() }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) =>
      deleteUserFn({ data: { userId }, headers: await getAuthHeaders() }),
    onSuccess: () => {
      toast.success('Usuario eliminado');
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'admin' | 'technician' }) =>
      updateUserRoleFn({ data: { userId, role }, headers: await getAuthHeaders() }),
    onSuccess: () => {
      toast.success('Rol actualizado');
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const filtered = users.filter((u) =>
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar por email..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={showForm} onOpenChange={setShowForm}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1 h-4 w-4" /> Nuevo Usuario</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Crear Usuario</DialogTitle></DialogHeader>
            <CreateUserForm onClose={() => setShowForm(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Rol</th>
                  <th className="hidden px-4 py-3 font-medium md:table-cell">Último ingreso</th>
                  <th className="px-4 py-3 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u) => {
                  const currentRole = u.roles.includes('admin') ? 'admin' : 'technician';
                  const isSelf = u.id === user.id;
                  return (
                    <tr key={u.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          {currentRole === 'admin' && <Shield className="h-3.5 w-3.5 text-primary" />}
                          {u.email}
                          {isSelf && <Badge variant="outline" className="text-[10px]">Tú</Badge>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={currentRole}
                          onValueChange={(v) =>
                            updateRoleMutation.mutate({ userId: u.id, role: v as 'admin' | 'technician' })
                          }
                          disabled={isSelf}
                        >
                          <SelectTrigger className="h-8 w-36"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Administrador</SelectItem>
                            <SelectItem value="technician">Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="hidden px-4 py-3 md:table-cell text-muted-foreground text-xs">
                        {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString('es-CO') : 'Nunca'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Resetear contraseña" onClick={() => setResetUserId(u.id)}>
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isSelf}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará permanentemente la cuenta <strong>{u.email}</strong>.
                                  Esta acción no se puede deshacer.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(u.id)}>
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No se encontraron usuarios</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!resetUserId} onOpenChange={(o) => !o && setResetUserId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Resetear contraseña</DialogTitle></DialogHeader>
          {resetUserId && (
            <ResetPasswordForm
              userId={resetUserId}
              email={users.find((u) => u.id === resetUserId)?.email ?? ''}
              onClose={() => setResetUserId(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CreateUserForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'technician'>('technician');

  const mutation = useMutation({
    mutationFn: async () => createUserFn({ data: { email, password, role }, headers: await getAuthHeaders() }),
    onSuccess: () => {
      toast.success('Usuario creado');
      queryClient.invalidateQueries({ queryKey: USERS_KEY });
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
      <div>
        <Label>Contraseña (mín. 8 caracteres)</Label>
        <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <Label>Rol</Label>
        <Select value={role} onValueChange={(v) => setRole(v as 'admin' | 'technician')}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Administrador</SelectItem>
            <SelectItem value="technician">Técnico</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button
        className="w-full"
        disabled={!email || password.length < 8 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear Usuario'}
      </Button>
    </div>
  );
}

function ResetPasswordForm({ userId, email, onClose }: { userId: string; email: string; onClose: () => void }) {
  const [password, setPassword] = useState('');

  const mutation = useMutation({
    mutationFn: async () => resetUserPasswordFn({ data: { userId, password }, headers: await getAuthHeaders() }),
    onSuccess: () => {
      toast.success('Contraseña actualizada');
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Cuenta: <strong>{email}</strong></p>
      <div>
        <Label>Nueva contraseña (mín. 8 caracteres)</Label>
        <Input type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <Button
        className="w-full"
        disabled={password.length < 8 || mutation.isPending}
        onClick={() => mutation.mutate()}
      >
        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Actualizar Contraseña'}
      </Button>
    </div>
  );
}
