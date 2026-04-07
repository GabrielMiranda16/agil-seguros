import { supabase } from '@/lib/customSupabaseClient';
import { cleanUserData } from '@/lib/userValidator';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const comparePassword = async (plain, stored) => {
  // Try bcrypt first (hashed passwords)
  const isBcrypt = stored && stored.startsWith('$2');
  if (isBcrypt) return bcrypt.compare(plain, stored);
  // Fallback: plain text comparison (legacy — migrates automatically on login)
  return plain === stored;
};

export const authService = {
  async loginUser(email, password) {
    try {
      // Query by email only — never compare passwords in the query
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error('Credenciais inválidas.');

      const isValid = await comparePassword(password, data.password);
      if (!isValid) throw new Error('Credenciais inválidas.');

      // Auto-migrate plain text password to bcrypt hash on first login
      if (data.password && !data.password.startsWith('$2')) {
        const hashed = await hashPassword(password);
        await supabase.from('users').update({ password: hashed }).eq('id', data.id);
      }

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async createUser(userData) {
    try {
      const cleanedData = cleanUserData(userData);
      if (cleanedData.password) {
        cleanedData.password = await hashPassword(cleanedData.password);
      }

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
      const payload = { ...updateData };
      if (payload.password) {
        payload.password = await hashPassword(payload.password);
      }

      const { data, error } = await supabase
        .from('users')
        .update(payload)
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