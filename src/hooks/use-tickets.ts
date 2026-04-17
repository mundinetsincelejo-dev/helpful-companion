import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Ticket, Client } from '@/lib/mock-data';
import type { Database } from '@/integrations/supabase/types';

const TICKETS_KEY = ['tickets'];
const CLIENTS_KEY = ['clients'];
const TECHNICIANS_KEY = ['technicians'];
const HISTORY_KEY = ['intervention_history'];
const PARTS_KEY = ['ticket_parts'];

export function useTickets(assignedToTechId?: string) {
  return useQuery({
    queryKey: assignedToTechId ? [...TICKETS_KEY, assignedToTechId] : TICKETS_KEY,
    queryFn: async () => {
      let query = supabase
        .from('tickets')
        .select('*, clients(*), technicians(id, name), ticket_parts(part_name)');

      if (assignedToTechId) {
        query = query.eq('assigned_tech_id', assignedToTechId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Ticket[];
    },
  });
}

export type Technician = Database['public']['Tables']['technicians']['Row'];
export type InterventionHistory = Database['public']['Tables']['intervention_history']['Row'];
export type TicketPart = Database['public']['Tables']['ticket_parts']['Row'];

export function useClients() {
  return useQuery({
    queryKey: CLIENTS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('company');
      if (error) throw error;
      return data as Client[];
    },
  });
}

export function useTechnicians() {
  return useQuery({
    queryKey: TECHNICIANS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('technicians')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as Technician[];
    },
  });
}

export function useTicketHistory(ticketId: number | null) {
  return useQuery({
    queryKey: [...HISTORY_KEY, ticketId],
    enabled: ticketId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('intervention_history')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as InterventionHistory[];
    },
  });
}

export function useTicketParts(ticketId: number | null) {
  return useQuery({
    queryKey: [...PARTS_KEY, ticketId],
    enabled: ticketId != null,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_parts')
        .select('*')
        .eq('ticket_id', ticketId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TicketPart[];
    },
  });
}

export function useAddHistory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Database['public']['Tables']['intervention_history']['Insert']) => {
      const { data, error } = await supabase
        .from('intervention_history')
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...HISTORY_KEY, data.ticket_id] });
    },
  });
}

export function useAddPart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entry: Database['public']['Tables']['ticket_parts']['Insert']) => {
      const { data, error } = await supabase
        .from('ticket_parts')
        .insert(entry)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [...PARTS_KEY, data.ticket_id] });
      queryClient.invalidateQueries({ queryKey: TICKETS_KEY });
    },
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (client: Database['public']['Tables']['clients']['Insert']) => {
      const { data, error } = await supabase.from('clients').insert(client).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }); },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, client }: { id: string; client: Database['public']['Tables']['clients']['Update'] }) => {
      const { data, error } = await supabase.from('clients').update(client).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }); },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: CLIENTS_KEY }); },
  });
}

export function useCreateTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (technician: Database['public']['Tables']['technicians']['Insert']) => {
      const { data, error } = await supabase.from('technicians').insert(technician).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TECHNICIANS_KEY }); },
  });
}

export function useUpdateTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, technician }: { id: string; technician: Database['public']['Tables']['technicians']['Update'] }) => {
      const { data, error } = await supabase.from('technicians').update(technician).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TECHNICIANS_KEY }); },
  });
}

export function useDeleteTechnician() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('technicians').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TECHNICIANS_KEY }); },
  });
}

export function useCreateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: Database['public']['Tables']['tickets']['Insert']) => {
      const { data, error } = await supabase
        .from('tickets')
        .insert(ticket)
        .select('*, clients(*), technicians(id, name), ticket_parts(part_name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TICKETS_KEY }); },
  });
}

export function useUpdateTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ticket }: { id: number; ticket: Database['public']['Tables']['tickets']['Update'] }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(ticket)
        .eq('id', id)
        .select('*, clients(*), technicians(id, name), ticket_parts(part_name)')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TICKETS_KEY }); },
  });
}

export function useDeleteTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: TICKETS_KEY }); },
  });
}
