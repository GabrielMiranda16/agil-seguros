export const cleanCoparticipacaoData = (data) => {
  const text = (val) => (val ? String(val).trim() : null);
  const number = (val) => {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  };

  return {
    empresa_id: number(data.empresa_id),
    beneficiario_id: number(data.beneficiario_id),
    competencia: text(data.competencia),
    valor: number(data.valor),
    descricao: text(data.descricao),
    nome_quem_utilizou: text(data.nome_quem_utilizou),
    cpf_quem_utilizou: text(data.cpf_quem_utilizou),
    data_registro: data.data_registro ? text(data.data_registro) : new Date().toISOString(),
  };
};

export const validateCoparticipacao = (data) => {
  const errors = [];

  if (!data.empresa_id) {
    errors.push('Empresa é obrigatória');
  }

  if (!data.beneficiario_id) {
    errors.push('Beneficiário é obrigatório');
  }

  if (!data.competencia) {
    errors.push('Competência é obrigatória');
  }

  if (data.valor === null || data.valor === undefined) {
    errors.push('Valor é obrigatório');
  }

  return errors;
};