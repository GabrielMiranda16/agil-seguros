const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

export function generateTempPassword(length = 10) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#!';
  let pwd = '';
  for (let i = 0; i < length; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function sendWelcomeEmail({ nomeCliente, emailCliente, senhaTemporaria }) {
  if (!SERVICE_ID || !TEMPLATE_ID || !PUBLIC_KEY) {
    console.warn('EmailJS não configurado — variáveis de ambiente ausentes.');
    return false;
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

    if (!response.ok) {
      const text = await response.text();
      console.error('EmailJS erro HTTP:', response.status, text);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail via EmailJS:', error);
    return false;
  }
}
