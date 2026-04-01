import { supabase } from '@/lib/customSupabaseClient';
import { cleanUserData } from '@/lib/userValidator';

export const authService = {
  async loginUser(email, password) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('password', password)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Credenciais inválidas.');

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async createUser(userData) {
    try {
      const cleanedData = cleanUserData(userData);

      const { data, error } = await supabase
        .from('users')
        .insert([cleanedData])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Create user error:', error);
      throw error;
    }
  },

  async updateUser(id, updateData) {
    try {
      const { data, error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Update user error:', error);
      throw error;
    }
  },

  async deleteUser(id) {
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Delete user error:', error);
      throw error;
    }
  },

  logoutUser() {
    localStorage.removeItem('user');
    return true;
  }
};