import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// Helper: verify caller is admin via user_roles table
async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', 'admin')
    .maybeSingle();
  if (error) throw new Error('Failed to verify admin');
  if (!data) throw new Error('Forbidden: admin role required');
}

export const listUsersFn = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw new Error(error.message);

    const userIds = data.users.map((u) => u.id);
    const { data: roles } = await supabaseAdmin
      .from('user_roles')
      .select('user_id, role')
      .in('user_id', userIds);

    const roleMap = new Map<string, string[]>();
    (roles ?? []).forEach((r) => {
      const arr = roleMap.get(r.user_id) ?? [];
      arr.push(r.role);
      roleMap.set(r.user_id, arr);
    });

    return data.users.map((u) => ({
      id: u.id,
      email: u.email ?? '',
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at,
      roles: (roleMap.get(u.id) ?? []) as Array<'admin' | 'technician'>,
    }));
  });

const createSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(8).max(100),
  role: z.enum(['admin', 'technician']),
});

export const createUserFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    if (!created.user) throw new Error('User not created');

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: created.user.id, role: data.role });
    if (roleError) throw new Error(roleError.message);

    return { id: created.user.id, email: created.user.email };
  });

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'technician']),
});

export const updateUserRoleFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => updateRoleSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Replace existing roles with the new single role
    await supabaseAdmin.from('user_roles').delete().eq('user_id', data.userId);
    const { error } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { success: true };
  });

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(8).max(100),
});

export const resetUserPasswordFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => resetPasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });

const deleteSchema = z.object({ userId: z.string().uuid() });

export const deleteUserFn = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteSchema.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) {
      throw new Error('No puedes eliminar tu propia cuenta');
    }
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });
