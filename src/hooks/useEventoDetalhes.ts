import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useEvento(id: string | undefined) {
    return useQuery({
        queryKey: ["evento", id],
        queryFn: async () => {
            if (!id) return null;
            const { data, error } = await supabase
                .from("eventos")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

export function useInscricoes(eventoId: string | undefined) {
    return useQuery({
        queryKey: ["inscricoes", eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const { data, error } = await supabase
                .from("inscricoes")
                .select(`
          *,
          usuarios:user_id(nome_completo, matricula),
          pagamentos(id, status, valor)
        `)
                .eq("evento_id", eventoId);

            if (error) throw error;

            return (data || []).map((item: any) => ({
                ...item,
                usuarios: Array.isArray(item.usuarios) ? item.usuarios[0] : item.usuarios,
                pagamentos: Array.isArray(item.pagamentos) ? item.pagamentos[0] : item.pagamentos,
            }));
        },
        enabled: !!eventoId,
    });
}

export function usePresencas(eventoId: string | undefined) {
    return useQuery({
        queryKey: ["presencas", eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const { data, error } = await supabase
                .from("presencas")
                .select("*")
                .eq("evento_id", eventoId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId,
    });
}

export function useCertificados(eventoId: string | undefined) {
    return useQuery({
        queryKey: ["certificados", eventoId],
        queryFn: async () => {
            if (!eventoId) return [];
            const { data, error } = await supabase
                .from("certificados")
                .select("*")
                .eq("evento_id", eventoId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!eventoId,
    });
}

export function useUpdatePagamento() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: 'aprovado' | 'rejeitado' }) => {
            const { error } = await supabase
                .from("pagamentos")
                .update({ status })
                .eq("id", id);

            if (error) throw error;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries to refetch data
            queryClient.invalidateQueries({ queryKey: ["inscricoes"] });
        },
    });
}

export function useTogglePresenca() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            eventoId,
            email,
            dia,
            nome,
            isPresente
        }: {
            eventoId: string;
            email: string;
            dia: number;
            nome: string;
            isPresente: boolean;
        }) => {
            if (isPresente) {
                // Remove presence
                const { error } = await supabase
                    .from("presencas")
                    .delete()
                    .eq("evento_id", eventoId)
                    .eq("usuario_email", email)
                    .eq("dia_evento", dia);
                if (error) throw error;
            } else {
                // Add presence
                const { error } = await supabase
                    .from("presencas")
                    .insert({
                        evento_id: eventoId,
                        usuario_email: email,
                        usuario_nome: nome,
                        dia_evento: dia,
                        data_presenca: new Date().toISOString(),
                        validado_por: "Organizador (Manual)",
                    });
                if (error) throw error;
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["presencas", variables.eventoId] });
        },
    });
}
