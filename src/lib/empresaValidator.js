export const removeCNPJMask = (cnpj) => {
  if (!cnpj) return '';
  return cnpj.replace(/[^\d]/g, '');
};

export const cleanEmpresaData = (data) => {
  const text = (val) => (val ? String(val).trim() : null);
  const number = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };
  
  return {
    razao_social: text(data.razao_social),
    nome_fantasia: text(data.nome_fantasia),
    cnpj: removeCNPJMask(data.cnpj),
    tipo: text(data.tipo),
    empresa_matriz_id: number(data.empresa_matriz_id),
    endereco_completo: text(data.endereco_completo),
    email_cliente: text(data.email_cliente),
    ativo: data.ativo !== undefined ? Boolean(data.ativo) : true,
  };
};

export const validateEmpresa = (data) => {
  const errors = [];

  if (!data.razao_social) {
    errors.push('Razão Social é obrigatória');
  }

  if (!data.cnpj || removeCNPJMask(data.cnpj).length !== 14) {
    errors.push('CNPJ inválido ou obrigatório');
  }

  if (!data.tipo) {
    errors.push('Tipo de empresa é obrigatório');
  }

  return errors;
};