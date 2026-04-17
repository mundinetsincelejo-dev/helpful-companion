-- CLIENTS: restrict reads
DROP POLICY IF EXISTS "All auth read clients" ON public.clients;
CREATE POLICY "Admins or assigned techs read clients"
  ON public.clients
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.client_id = clients.id
        AND t.assigned_tech_id = public.get_current_technician_id()
    )
  );

-- TECHNICIANS: restrict reads
DROP POLICY IF EXISTS "All auth read technicians" ON public.technicians;
CREATE POLICY "Admins or self read technicians"
  ON public.technicians
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR id = public.get_current_technician_id()
  );

-- TICKET_PARTS: restrict reads
DROP POLICY IF EXISTS "Auth read ticket_parts" ON public.ticket_parts;
CREATE POLICY "Admins or assigned techs read ticket_parts"
  ON public.ticket_parts
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = ticket_parts.ticket_id
        AND t.assigned_tech_id = public.get_current_technician_id()
    )
  );

-- INTERVENTION_HISTORY: restrict reads
DROP POLICY IF EXISTS "Auth read history" ON public.intervention_history;
CREATE POLICY "Admins or assigned techs read history"
  ON public.intervention_history
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.tickets t
      WHERE t.id = intervention_history.ticket_id
        AND t.assigned_tech_id = public.get_current_technician_id()
    )
  );