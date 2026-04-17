import { supabase } from '@/integrations/supabase/client';

/**
 * Returns headers with the current user's Bearer token, for use when
 * calling server functions that require auth.
 */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}
