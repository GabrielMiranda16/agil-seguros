const SERVICE_ID                  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID                 = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY                  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
const TEMPLATE_TERMOS_CLIENTE     = import.meta.env.VITE_EMAILJS_TEMPLATE_TERMOS_CLIENTE;
const TEMPLATE_TERMOS_EMPRESA     = import.meta.env.VITE_EMAILJS_TEMPLATE_TERMOS_EMPRESA;
const EMPRESA_EMAIL               = import.meta.env.VITE_EMPRESA_EMAIL;

export function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function sendTermosConfirmacaoCliente({ nomeCliente, emailCliente, versao, data, aceitouWhatsapp, aceitouEmail }) {
  if (!SERVICE_ID || !TEMPLATE_TERMOS_CLIENTE || !PUBLIC_KEY) return { ok: false };
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_TERMOS_CLIENTE,
        user_id: PUBLIC_KEY,
        template_params: {
          to_name: nomeCliente,
          to_email: emailCliente,
          versao_termos: versao,
          data_aceite: data,
          aceite_whatsapp: aceitouWhatsapp ? 'Sim' : 'Não',
          aceite_email: aceitouEmail ? 'Sim' : 'Não',
          from_name: 'Ágil Seguros',
        },
      }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

export async function sendTermosNotificacaoEmpresa({ nomeCliente, emailCliente, versao, data, ip, aceitouWhatsapp, aceitouEmail }) {
  if (!SERVICE_ID || !TEMPLATE_TERMOS_EMPRESA || !PUBLIC_KEY || !EMPRESA_EMAIL) return { ok: false };
  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id: SERVICE_ID,
        template_id: TEMPLATE_TERMOS_EMPRESA,
        user_id: PUBLIC_KEY,
        template_params: {
          to_email: EMPRESA_EMAIL,
          cliente_nome: nomeCliente,
          cliente_email: emailCliente,
          versao_termos: versao,
          data_aceite: data,
          ip_aceite: ip,
          aceite_whatsapp: aceitouWhatsapp ? 'Sim' : 'Não',
          aceite_email: aceitouEmail ? 'Sim' : 'Não',
          from_name: 'Ágil Seguros - Sistema',
        },
      }),
    });
    return { ok: response.ok };
  } catch {
    return { ok: false };
  }
}

export async function sendWelcomeEmail({ nomeCliente, emailCliente, senhaTemporaria }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    return { ok: false, error: 'Variáveis de ambiente do EmailJS não configuradas no servidor.' };
  }

  try {
    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service_id:      SERVICE_ID,
        template_id:     TEMPLATE_ID,
        user_id:         PUBLIC_KEY,
        template_params: {
          to_name:       nomeCliente,
          to_email:      emailCliente,
          temp_password: senhaTemporaria,
          from_name:     'Seguros Ágil',
        },
      }),
    });

    const text = await response.text();

    if (!response.ok) {
      return { ok: false, error: `EmailJS [${response.status}]: ${text}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}
