-- 1. Enum de roles
CREATE TYPE public.app_role AS ENUM ('admin', 'technician');

-- 2. Tabla user_roles
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 3. Función has_role (security definer, evita recursión)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 4. Función para obtener el technician_id del usuario autenticado (por email)
CREATE OR REPLACE FUNCTION public.get_current_technician_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id FROM public.technicians t
  JOIN auth.users u ON lower(u.email) = lower(t.email)
  WHERE u.id = auth.uid()
  LIMIT 1
$$;

-- 5. RLS para user_roles
CREATE POLICY "Admins manage all roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 6. Reemplazar políticas de tickets
DROP POLICY IF EXISTS "Auth users select tickets" ON public.tickets;
DROP POLICY IF EXISTS "Auth users insert tickets" ON public.tickets;
DROP POLICY IF EXISTS "Auth users update tickets" ON public.tickets;
DROP POLICY IF EXISTS "Auth users delete tickets" ON public.tickets;

CREATE POLICY "Admins all tickets select" ON public.tickets
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians own tickets select" ON public.tickets
  FOR SELECT TO authenticated
  USING (assigned_tech_id = public.get_current_technician_id());

CREATE POLICY "Admins insert tickets" ON public.tickets
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update all tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Technicians update own tickets" ON public.tickets
  FOR UPDATE TO authenticated
  USING (assigned_tech_id = public.get_current_technician_id())
  WITH CHECK (assigned_tech_id = public.get_current_technician_id() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete tickets" ON public.tickets
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 7. Reemplazar políticas de technicians
DROP POLICY IF EXISTS "Auth users select technicians" ON public.technicians;
DROP POLICY IF EXISTS "Auth users insert technicians" ON public.technicians;
DROP POLICY IF EXISTS "Auth users update technicians" ON public.technicians;
DROP POLICY IF EXISTS "Auth users delete technicians" ON public.technicians;

CREATE POLICY "All auth read technicians" ON public.technicians
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage technicians" ON public.technicians
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update technicians" ON public.technicians
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete technicians" ON public.technicians
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 8. Reemplazar políticas de clients
DROP POLICY IF EXISTS "Auth users select clients" ON public.clients;
DROP POLICY IF EXISTS "Auth users insert clients" ON public.clients;
DROP POLICY IF EXISTS "Auth users update clients" ON public.clients;
DROP POLICY IF EXISTS "Auth users delete clients" ON public.clients;

CREATE POLICY "All auth read clients" ON public.clients
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage clients insert" ON public.clients
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage clients update" ON public.clients
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage clients delete" ON public.clients
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 9. Reemplazar políticas de ticket_parts
DROP POLICY IF EXISTS "Auth users select ticket_parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Auth users insert ticket_parts" ON public.ticket_parts;
DROP POLICY IF EXISTS "Auth users delete ticket_parts" ON public.ticket_parts;

CREATE POLICY "Auth read ticket_parts" ON public.ticket_parts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert ticket_parts admin or assigned tech" ON public.ticket_parts
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_parts.ticket_id
        AND t.assigned_tech_id = public.get_current_technician_id()
    )
  );

CREATE POLICY "Delete ticket_parts admin" ON public.ticket_parts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 10. Reemplazar políticas de intervention_history
DROP POLICY IF EXISTS "Auth users select history" ON public.intervention_history;
DROP POLICY IF EXISTS "Auth users insert history" ON public.intervention_history;

CREATE POLICY "Auth read history" ON public.intervention_history
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Insert history admin or assigned tech" ON public.intervention_history
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = intervention_history.ticket_id
        AND t.assigned_tech_id = public.get_current_technician_id()
    )
  );

-- 11. Asignar roles iniciales basados en usuarios auth existentes
INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'admin'::public.app_role
FROM auth.users u
WHERE lower(u.email) = 'mundinet.sincelejo@gmail.com'
ON CONFLICT DO NOTHING;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'technician'::public.app_role
FROM auth.users u
JOIN public.technicians t ON lower(t.email) = lower(u.email)
WHERE lower(u.email) <> 'mundinet.sincelejo@gmail.com'
ON CONFLICT DO NOTHING;