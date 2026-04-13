import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { authService } from '@/services/authService';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck, MessageCircle, Mail } from 'lucide-react';
import { motion } from 'framer-motion';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

const TermosAceite = () => {
  const { user, updateUser, authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [aceitouWhatsapp, setAceitouWhatsapp] = useState(false);
  const [aceitouEmail, setAceitouEmail] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getHomeRoute = () => {
    if (!user) return '/login';
    if (user.perfil === 'CEO') return '/ceo';
    if (user.perfil === 'ADM') return '/admin';
    return '/select-segmento';
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.aceite_termos) return <Navigate to={getHomeRoute()} replace />;

  const handleSubmit = async () => {
    if (!aceitouTermos) return;
    setIsSubmitting(true);
    try {
      await authService.updateUser(user.id, {
        aceite_termos: true,
        aceite_whatsapp: aceitouWhatsapp,
        aceite_email: aceitouEmail,
        data_aceite_termos: new Date().toISOString(),
      });
      updateUser({ ...user, aceite_termos: true, aceite_whatsapp: aceitouWhatsapp, aceite_email: aceitouEmail });
      navigate(getHomeRoute(), { replace: true });
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao salvar. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-start p-4 pt-8 pb-12 bg-soft-gradient overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <img src={logoUrl} alt="Ágil Seguros" className="h-20 w-auto object-contain mx-auto mb-6" />

        <div className="bg-white/95 rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-[#003580] px-6 py-5 flex items-center gap-3">
            <ShieldCheck className="h-7 w-7 text-white shrink-0" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Termos de Uso e Privacidade</h1>
              <p className="text-white/70 text-xs mt-0.5">Leia com atenção antes de continuar</p>
            </div>
          </div>

          {/* Termos */}
          <div className="px-6 py-4 max-h-72 overflow-y-auto text-sm text-gray-600 space-y-4 border-b border-gray-100 leading-relaxed">
            <div>
              <p className="font-semibold text-gray-800 mb-1">1. Controlador dos Dados</p>
              <p>A <strong>Ágil Seguros</strong> é a responsável pelo tratamento dos seus dados pessoais, atuando como controladora nos termos da Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018).</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">2. Dados Coletados</p>
              <p>Coletamos dados de identificação pessoal (nome, CPF/CNPJ, data de nascimento, endereço, telefone e e-mail), dados de beneficiários vinculados e informações relativas às apólices de seguros contratadas.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">3. Finalidade do Tratamento</p>
              <p>Os dados são utilizados exclusivamente para: (a) gestão e administração de apólices de seguros; (b) comunicação sobre vigências, renovações e alterações contratuais; (c) cumprimento de obrigações legais e regulatórias; (d) prestação de suporte ao cliente.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">4. Compartilhamento de Dados</p>
              <p>Seus dados poderão ser compartilhados com seguradoras, operadoras e prestadores de serviço estritamente necessários para a execução dos contratos de seguro. Não vendemos nem cedemos seus dados a terceiros para fins comerciais.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">5. Segurança e Armazenamento</p>
              <p>Adotamos medidas técnicas e administrativas para proteger seus dados contra acesso não autorizado, perda ou divulgação indevida. Os dados são armazenados em servidores seguros e ficam disponíveis pelo prazo mínimo exigido pela legislação vigente.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">6. Seus Direitos (LGPD)</p>
              <p>Você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou incorretos; solicitar a anonimização, bloqueio ou eliminação de dados desnecessários; revogar seu consentimento a qualquer momento. Para exercer esses direitos, entre em contato conosco.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">7. Responsabilidade do Usuário</p>
              <p>O usuário é responsável pela veracidade das informações fornecidas e pela guarda de suas credenciais de acesso. Qualquer uso indevido das credenciais é de responsabilidade exclusiva do usuário.</p>
            </div>
            <div>
              <p className="font-semibold text-gray-800 mb-1">8. Alterações nesta Política</p>
              <p>Reservamo-nos o direito de atualizar esta política a qualquer momento. Alterações relevantes serão comunicadas através do sistema.</p>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="px-6 py-5 space-y-4">
            {/* Obrigatório */}
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={aceitouTermos}
                onChange={e => setAceitouTermos(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-700 leading-snug">
                <strong>Li e aceito</strong> os Termos de Uso e a Política de Privacidade da Ágil Seguros, conforme a LGPD.{' '}
                <span className="text-red-500 font-semibold">*</span>
              </span>
            </label>

            {/* Opcional WhatsApp */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouWhatsapp}
                onChange={e => setAceitouWhatsapp(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug flex items-center gap-2 flex-wrap">
                <MessageCircle className="h-4 w-4 text-green-500 shrink-0" />
                Aceito receber comunicações e promoções por <strong>WhatsApp</strong>.{' '}
                <span className="text-gray-400 text-xs">(opcional)</span>
              </span>
            </label>

            {/* Opcional Email */}
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={aceitouEmail}
                onChange={e => setAceitouEmail(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#003580] cursor-pointer shrink-0"
              />
              <span className="text-sm text-gray-600 leading-snug flex items-center gap-2 flex-wrap">
                <Mail className="h-4 w-4 text-blue-500 shrink-0" />
                Aceito receber comunicações e promoções por <strong>E-mail</strong>.{' '}
                <span className="text-gray-400 text-xs">(opcional)</span>
              </span>
            </label>

            <p className="text-xs text-gray-400"><span className="text-red-500">*</span> Campo obrigatório para continuar.</p>

            <Button
              onClick={handleSubmit}
              disabled={!aceitouTermos || isSubmitting}
              className="w-full rounded-full font-bold text-white mt-2"
              style={{ background: aceitouTermos ? '#003580' : undefined }}
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Continuar
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TermosAceite;
