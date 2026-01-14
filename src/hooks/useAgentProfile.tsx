import { useState, useEffect } from 'react';
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

export function useAgentProfile() {
  const { user } = useAuth();
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create abort controller for cleanup
    const abortController = new AbortController();
    let isMounted = true;

    if (!user?.email) {
      setAgent(null);
      setIsLoading(false);
      return;
    }

    const fetchAgentProfile = async () => {
      try {
        setIsLoading(true);
        
        // Extract CPF from email (format: cpf@agent.plantaopro.com)
        const emailParts = user.email.split('@');
        const localPart = emailParts[0] || '';
        const cpfDigits = localPart.replace(/\D/g, '');
        const looksLikeCpf = cpfDigits.length === 11;
        
        // If the auth email isn't in CPF format, skip CPF lookup and fallback to email lookup
        if (looksLikeCpf) {
          // First try to find by CPF (digits)
          const { data, error: fetchError } = await (supabase as any)
            .from('agents')
            .select(`
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
            `)
            .eq('cpf', cpfDigits)
            .maybeSingle()
            .abortSignal(abortController.signal);

          if (fetchError) {
            // Don't throw on abort
            if (fetchError.message?.includes('abort')) return;
            throw fetchError;
          }

          // If not found, try formatted CPF (some older rows were saved as 000.000.000-00)
          if (!data && isMounted) {
            const cpfFormatted = formatCPF(cpfDigits);
            const { data: formattedData, error: formattedError } = await (supabase as any)
              .from('agents')
              .select(`
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
              `)
              .eq('cpf', cpfFormatted)
              .maybeSingle()
              .abortSignal(abortController.signal);

            if (formattedError) {
              if (formattedError.message?.includes('abort')) return;
              throw formattedError;
            }

            if (formattedData && isMounted) {
              setAgent({
                ...formattedData,
                unit: formattedData.units as AgentProfile['unit'],
              });
              return;
            }
          }

          if (data && isMounted) {
            setAgent({
              ...data,
              unit: data.units as AgentProfile['unit'],
            });
            return;
          }
        }

        // If not found by CPF (or not CPF format), try by email
        if (!isMounted) return;
        
        const { data: emailData, error: emailError } = await (supabase as any)
          .from('agents')
          .select(`
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
          `)
          .eq('email', user.email)
          .maybeSingle()
          .abortSignal(abortController.signal);

        if (emailError) {
          if (emailError.message?.includes('abort')) return;
          throw emailError;
        }

        if (isMounted) {
          if (emailData) {
            setAgent({
              ...emailData,
              unit: emailData.units as AgentProfile['unit'],
            });
          } else {
            setAgent(null);
          }
        }
      } catch (err) {
        // Ignore abort errors silently
        if (err instanceof Error && err.message?.includes('abort')) {
          return;
        }
        console.error('Error fetching agent profile:', err);
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAgentProfile();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, [user?.email]);

  return { agent, isLoading, error };
}
