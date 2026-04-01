import { supabase } from '@/lib/customSupabaseClient';
import { cleanCoparticipacaoData } from '@/lib/coparticipacaoValidator';

export const coparticipacaoService = {
  async getAllCoparticipacoes() {
    try {
      const { data, error } = await supabase
        .from('coparticipacoes')
        .select(`
          *,
          beneficiarios (
            nome_completo,
            cpf
          ),
          empresas (
            razao_social,
            nome_fantasia
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar todas as coparticipações:', error);
      throw new Error('Não foi possível carregar a lista de coparticipações.');
    }
  },

  async getCoparticipacoesByEmpresa(empresa_id) {
    try {
      const { data, error } = await supabase
        .from('coparticipacoes')
        .select(`
          *,
          beneficiarios (
            nome_completo,
            cpf
          )
        `)
        .eq('empresa_id', empresa_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Erro ao buscar coparticipações da empresa:', error);
      throw new Error('Não foi possível carregar as coparticipações desta empresa.');
    }
  },

  async createCoparticipacao(coparticipacaoData) {
    try {
      const cleanedData = cleanCoparticipacaoData(coparticipacaoData);
      
      const { data, error } = await supabase
        .from('coparticipacoes')
        .insert([cleanedData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao criar coparticipação:', error);
      throw new Error('Não foi possível registrar a coparticipação. Verifique os dados e tente novamente.');
    }
  },

  async updateCoparticipacao(id, updateData) {
    try {
      const cleanedData = cleanCoparticipacaoData(updateData);
      
      // Remove id from payload if it exists to prevent PK conflicts
      delete cleanedData.id;

      const { data, error } = await supabase
        .from('coparticipacoes')
        .update(cleanedData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Erro ao atualizar coparticipação:', error);
      throw new Error('Não foi possível atualizar a coparticipação.');
    }
  },

  async deleteCoparticipacao(id) {
    try {
      const { error } = await supabase
        .from('coparticipacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Erro ao excluir coparticipação:', error);
      throw new Error('Não foi possível excluir a coparticipação.');
    }
  }
};