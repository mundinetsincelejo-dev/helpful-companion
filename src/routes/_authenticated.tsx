import { createFileRoute, Outlet, redirect } from '@tanstack/react-router';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/AppLayout';

export interface UserWithRole {
  id: string;
  email: string;
  role: 'admin' | 'technician';
  technicianId?: string;
}

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw redirect({ to: '/login', search: { redirect: location.href } });
    }

    const userEmail = session.user.email?.trim().toLowerCase() ?? '';

    // Get role from user_roles table (admin takes precedence)
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', session.user.id);

    const roleSet = new Set((roles ?? []).map((r) => r.role));
    const userRole: 'admin' | 'technician' = roleSet.has('admin')
      ? 'admin'
      : roleSet.has('technician')
        ? 'technician'
        : 'technician';

    let technicianId: string | undefined;
    if (userRole === 'technician') {
      const { data } = await supabase
        .from('technicians')
        .select('id')
        .eq('email', userEmail)
        .maybeSingle();
      technicianId = data?.id;
    }

    return {
      user: {
        id: session.user.id,
        email: userEmail,
        role: userRole,
        technicianId,
      } as UserWithRole,
    };
  },
  component: AuthenticatedComponent,
});

function AuthenticatedComponent() {
  const { user } = Route.useRouteContext();
  return (
    <AppLayout user={user}>
      <Outlet />
    </AppLayout>
  );
}
