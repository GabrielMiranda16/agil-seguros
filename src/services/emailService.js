import emailjs from '@emailjs/browser';

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

// Initialize emailjs once when module loads (required in v4)
if (PUBLIC_KEY) {
  emailjs.init({ publicKey: PUBLIC_KEY });
}

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
    console.warn('EmailJS não configurado. Verifique VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no .env.local');
    return false;
  }

  try {
    const result = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_name:       nomeCliente,
        to_email:      emailCliente,
        temp_password: senhaTemporaria,
        from_name:     'Seguros Ágil',
      }
    );
    console.log('EmailJS result:', result);
    return true;
  } catch (error) {
    console.error('Erro ao enviar e-mail via EmailJS:', error);
    return false;
  }
}
