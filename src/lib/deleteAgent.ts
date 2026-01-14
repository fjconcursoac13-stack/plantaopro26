import { supabase } from '@/integrations/supabase/client';

/**
 * Exclui TODOS os dados relacionados a um agente de TODAS as tabelas.
 * Esta função garante que nenhum dado órfão permaneça no sistema.
 * 
 * @param agentId - O ID do agente a ser excluído
 * @returns Promise com resultado da operação
 */
export async function deleteAllAgentData(agentId: string): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  console.log(`[deleteAllAgentData] Iniciando exclusão completa para agente: ${agentId}`);

  // 1. Excluir dados de chat primeiro (dependências)
  try {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('sender_id', agentId);

    if (messages && messages.length > 0) {
      const messageIds = messages.map(m => m.id);
      await supabase
        .from('deleted_messages')
        .delete()
        .in('message_id', messageIds);
    }
  } catch (err) {
    console.warn('[deleteAllAgentData] Erro ao limpar deleted_messages por mensagens:', err);
  }

  // 2. Excluir de cada tabela individualmente
  const deleteFromTable = async (tableName: string, column: string) => {
    try {
      // @ts-ignore - Dynamic table names
      const { error } = await supabase.from(tableName).delete().eq(column, agentId);
      if (error) {
        console.warn(`[deleteAllAgentData] Erro em ${tableName}:`, error.message);
        errors.push(`${tableName}: ${error.message}`);
      } else {
        console.log(`[deleteAllAgentData] ✓ ${tableName} limpo`);
      }
    } catch (err) {
      console.warn(`[deleteAllAgentData] Exceção em ${tableName}:`, err);
      errors.push(`${tableName}: ${String(err)}`);
    }
  };

  // Excluir de todas as tabelas com agent_id
  await deleteFromTable('shift_alerts', 'agent_id');
  await deleteFromTable('overtime_bank', 'agent_id');
  await deleteFromTable('agent_shifts', 'agent_id');
  await deleteFromTable('agent_events', 'agent_id');
  await deleteFromTable('agent_leaves', 'agent_id');
  await deleteFromTable('shift_planner_configs', 'agent_id');
  await deleteFromTable('shifts', 'agent_id');
  await deleteFromTable('transfer_requests', 'agent_id');
  await deleteFromTable('chat_room_members', 'agent_id');
  await deleteFromTable('deleted_messages', 'agent_id');
  await deleteFromTable('access_logs', 'agent_id');
  await deleteFromTable('payments', 'agent_id');
  
  // chat_messages usa sender_id
  await deleteFromTable('chat_messages', 'sender_id');

  // 3. Excluir user_roles e profiles
  try {
    await supabase.from('user_roles').delete().eq('user_id', agentId);
    console.log('[deleteAllAgentData] ✓ user_roles limpo');
  } catch (err) {
    console.warn('[deleteAllAgentData] Erro em user_roles:', err);
  }

  try {
    await supabase.from('profiles').delete().eq('user_id', agentId);
    console.log('[deleteAllAgentData] ✓ profiles limpo');
  } catch (err) {
    console.warn('[deleteAllAgentData] Erro em profiles:', err);
  }

  console.log(`[deleteAllAgentData] Exclusão completa. Erros: ${errors.length}`);

  return {
    success: errors.length === 0,
    errors,
  };
}

/**
 * Exclui um agente e TODOS os dados relacionados do sistema.
 * O trigger do banco de dados irá excluir o usuário auth automaticamente.
 * 
 * @param agentId - O ID do agente a ser excluído
 * @returns Promise com resultado da operação
 */
export async function deleteAgentCompletely(agentId: string): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Primeiro excluir todos os dados relacionados
    const { errors } = await deleteAllAgentData(agentId);
    
    if (errors.length > 0) {
      console.warn('[deleteAgentCompletely] Alguns dados podem não ter sido excluídos:', errors);
    }

    // 2. Agora excluir o registro do agente (trigger excluirá auth.users)
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentId);

    if (error) {
      console.error('[deleteAgentCompletely] Erro ao excluir agente:', error);
      return { success: false, error: error.message };
    }

    console.log('[deleteAgentCompletely] ✓ Agente excluído com sucesso');
    return { success: true };
  } catch (err) {
    console.error('[deleteAgentCompletely] Exceção:', err);
    return { success: false, error: String(err) };
  }
}
