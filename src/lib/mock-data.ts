import type { Database } from '@/integrations/supabase/types';

// Types derived from database
export type TicketStatus = Database['public']['Enums']['ticket_status'];
export type TicketPriority = Database['public']['Enums']['ticket_priority'];
export type ServiceType = Database['public']['Enums']['service_type'];

export type Client = Database['public']['Tables']['clients']['Row'];
export type TicketRow = Database['public']['Tables']['tickets']['Row'];

export interface Ticket extends TicketRow {
  clients: Client;
  technicians: { id: string; name: string } | null;
  ticket_parts: { part_name: string }[];
}

export const statusLabels: Record<TicketStatus, string> = {
  abierto: 'Abierto',
  en_proceso: 'En Proceso',
  pausado: 'Pausado',
  cerrado: 'Cerrado',
};

export const priorityLabels: Record<TicketPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  critica: 'Crítica',
};

export const serviceTypeLabels: Record<ServiceType, string> = {
  impresoras: 'Impresoras',
  computadores: 'Computadores',
  redes_telecom: 'Redes y Telecomunicaciones',
  camaras_seguridad: 'Cámaras de Seguridad',
  desarrollo_software: 'Desarrollo de Software',
  soporte_general: 'Soporte General',
};
