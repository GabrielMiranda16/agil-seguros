import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO } from 'date-fns';

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export const calculateAge = (birthDate) => {
  if (!birthDate) return '';
  try {
    const today = new Date();
    const dob = new Date(birthDate);
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  } catch (e) {
    return '';
  }
};

export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  try {
    const parsedDate = parseISO(dateString);
    if (isNaN(parsedDate)) {
       const directDate = new Date(dateString);
       if(isNaN(directDate)) return "Data inválida";
       return format(directDate, 'dd/MM/yyyy');
    }
    return format(parsedDate, 'dd/MM/yyyy');
  } catch (error) {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy');
    } catch (innerError) {
      return 'Data inválida';
    }
  }
};

export const formatDateTime = (isoString) => {
  if (!isoString) return '';
  return new Date(isoString).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatCurrency = (value) => {
    const num = Number(value);
    if (isNaN(num)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(num);
};