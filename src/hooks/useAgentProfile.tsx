import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatCPF } from '@/lib/validators';

interface AgentProfile {
  id: string;
  name: string;
  cpf: string | null;
  matricula: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  team: string | null;
  birth_date: string | null;
  age: number | null;
  is_active: boolean | null;
  unit_id: string | null;
  role: string | null;
  blood_type: string | null;
  avatar_url: string | null;
  license_status: string | null;
  license_expires_at: string | null;
  license_notes: string | null;
  unit: {
    id: string;
    name: string;
    municipality: string;
  } | null;
}

const AGENT_SELECT_QUERY = `
  id,
  name,
  cpf,
  matricula,
  email,
  phone,
  address,
  team,
  birth_date,
  age,
  is_active,
  unit_id,
  role,
  blood_type,
  avatar_url,
  license_status,
  license_expires_at,
  license_notes,
  units:unit_id (
    id,
    name,
    municipality
  )
`;

export function useAgentProfile() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // Prevent duplicate fetches
  const fetchingRef = useRef(false);
  const lastEmailRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!user?.email) {
      setAgent(null);
      setIsLoading(false);
      lastEmailRef.current = null;
      return;
    }

    // Skip if already fetching or email hasn't changed
    if (fetchingRef.current || lastEmailRef.current === user.email) {
      if (lastEmailRef.current === user.email && agent) {
        setIsLoading(false);
      }
      return;
    }

    const fetchAgentProfile = async () => {
      // Prevent concurrent fetches
      if (fetchingRef.current || !mountedRef.current) return;
      fetchingRef.current = true;

      try {
        setIsLoading(true);
        setError(null);

        let foundAgent = null;

        // 1) Most reliable: link by auth user id (agents.id is created to match auth.uid())
        if (mountedRef.current) {
          const { data: idData, error: idError } = await (supabase as any)
            .from('agents')
            .select(AGENT_SELECT_QUERY)
            .eq('id', user.id)
            .maybeSingle();

          if (idError) throw idError;
          if (idData) {
            foundAgent = idData;
          }
        }

        // 2) Fallback: Extract CPF from virtual email (format: cpf@agent.plantaopro.com)
        if (!foundAgent && mountedRef.current) {
          const emailParts = user.email!.split('@');
          const localPart = emailParts[0] || '';
          const cpfDigits = localPart.replace(/\D/g, '');
          const looksLikeCpf = cpfDigits.length === 11;

          if (looksLikeCpf) {
            const { data, error: fetchError } = await (supabase as any)
              .from('agents')
              .select(AGENT_SELECT_QUERY)
              .eq('cpf', cpfDigits)
              .maybeSingle();

            if (fetchError) throw fetchError;

            if (data) {
              foundAgent = data;
            } else {
              // Try formatted CPF (legacy format: 000.000.000-00)
              const cpfFormatted = formatCPF(cpfDigits);
              const { data: formattedData, error: formattedError } = await (supabase as any)
                .from('agents')
                .select(AGENT_SELECT_QUERY)
                .eq('cpf', cpfFormatted)
                .maybeSingle();

              if (formattedError) throw formattedError;
              if (formattedData) foundAgent = formattedData;
            }
          }
        }

        // 3) Last fallback: try email lookup (only works if agents.email is filled)
        if (!foundAgent && mountedRef.current) {
          const { data: emailData, error: emailError } = await (supabase as any)
            .from('agents')
            .select(AGENT_SELECT_QUERY)
            .eq('email', user.email)
            .maybeSingle();

          if (emailError) throw emailError;
          if (emailData) foundAgent = emailData;
        }

        if (mountedRef.current) {
          if (foundAgent) {
            setAgent({
              ...foundAgent,
              unit: foundAgent.units as AgentProfile['unit'],
            });
          } else {
            setAgent(null);
          }
          lastEmailRef.current = user.email!;
        }
      } catch (err) {
        console.error('Error fetching agent profile:', err);
        if (mountedRef.current) {
          setError(err as Error);
        }
      } finally {
        if (mountedRef.current) {
          setIsLoading(false);
        }
        fetchingRef.current = false;
      }
    };

    // Small delay to debounce rapid auth state changes
    const timer = setTimeout(fetchAgentProfile, 100);

    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      fetchingRef.current = false;
    };
  }, [user?.email]);

  // Function to manually refetch profile
  const refetch = async () => {
    if (!user?.email || fetchingRef.current) return;
    
    lastEmailRef.current = null; // Force refetch
    fetchingRef.current = false;
    
    // Trigger useEffect by forcing a state update
    setIsLoading(true);
  };

  return { agent, isLoading, error, refetch };
}
