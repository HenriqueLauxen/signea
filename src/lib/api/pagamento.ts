import { supabase } from "../supabase";

/**
 * Verifica o status do pagamento de uma inscrição
 * GET /api/pagamento/status?id={INSCRICAO_ID}
 */
export const getPagamentoStatus = async (inscricaoId: string): Promise<{ status: "pendente" | "pago" }> => {
  try {
    const { data, error } = await supabase
      .from('inscricoes')
      .select('pagamento_status')
      .eq('id', inscricaoId)
      .single();

    if (error) throw error;

    // Se não tiver campo pagamento_status, assume pendente
    const status = data?.pagamento_status || 'pendente';
    
    return {
      status: status === 'pago' ? 'pago' : 'pendente'
    };
  } catch (error) {
    console.error('Erro ao verificar status do pagamento:', error);
    return { status: 'pendente' };
  }
};

/**
 * Confirma o pagamento de uma inscrição
 * POST /api/pagamento/confirmar?id={INSCRICAO_ID}
 */
export const confirmarPagamento = async (inscricaoId: string): Promise<{ success: boolean }> => {
  try {
    const { error } = await supabase
      .from('inscricoes')
      .update({ 
        pagamento_status: 'pago',
        status: 'confirmada'
      })
      .eq('id', inscricaoId);

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Erro ao confirmar pagamento:', error);
    return { success: false };
  }
};

