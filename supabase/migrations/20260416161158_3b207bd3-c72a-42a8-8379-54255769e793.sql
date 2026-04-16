DO $$ BEGIN CREATE TYPE public.service_type AS ENUM ('impresoras', 'computadores', 'redes_telecom', 'camaras_seguridad', 'desarrollo_software', 'soporte_general'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.ticket_priority AS ENUM ('baja', 'media', 'alta', 'critica'); EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN CREATE TYPE public.ticket_status AS ENUM ('abierto', 'en_proceso', 'pausado', 'cerrado'); EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.technicians (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  specialties public.service_type[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.tickets (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_type public.service_type NOT NULL DEFAULT 'soporte_general',
  priority public.ticket_priority NOT NULL DEFAULT 'media',
  status public.ticket_status NOT NULL DEFAULT 'abierto',
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  equipment_model TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  assigned_tech_id UUID REFERENCES public.technicians(id) ON DELETE SET NULL,
  scheduled_date DATE,
  scheduled_time TIME,
  closed_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  resolution_time_hours NUMERIC(6,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ticket_parts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  part_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.intervention_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id INTEGER NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by TEXT NOT NULL DEFAULT '',
  details TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.technicians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intervention_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users select clients" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update clients" ON public.clients FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users delete clients" ON public.clients FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users select technicians" ON public.technicians FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert technicians" ON public.technicians FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update technicians" ON public.technicians FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users delete technicians" ON public.technicians FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users select tickets" ON public.tickets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users update tickets" ON public.tickets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Auth users delete tickets" ON public.tickets FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users select ticket_parts" ON public.ticket_parts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert ticket_parts" ON public.ticket_parts FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Auth users delete ticket_parts" ON public.ticket_parts FOR DELETE TO authenticated USING (true);

CREATE POLICY "Auth users select history" ON public.intervention_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users insert history" ON public.intervention_history FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_technicians_updated_at BEFORE UPDATE ON public.technicians FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_tickets_client_id ON public.tickets(client_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON public.tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_scheduled_date ON public.tickets(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_tech ON public.tickets(assigned_tech_id);
CREATE INDEX IF NOT EXISTS idx_ticket_parts_ticket_id ON public.ticket_parts(ticket_id);
CREATE INDEX IF NOT EXISTS idx_intervention_history_ticket_id ON public.intervention_history(ticket_id);