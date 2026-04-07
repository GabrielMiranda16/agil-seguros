import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LogOut, HeartPulse, Car, Plane, Home, PawPrint, Building2, Loader2, ChevronRight } from 'lucide-react';

const SEGMENTO_CONFIG = {
  SAUDE_VIDA_ODONTO: {
    label: 'Saúde, Vida e Odonto',
    descricao: 'Planos de saúde, seguro de vida e planos odontológicos',
    icon: HeartPulse,
    color: 'blue',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    iconColor: 'text-blue-500',
    badgeBg: 'bg-blue-100 text-blue-800',
  },
  AUTO_FROTA: {
    label: 'Auto e Frota',
    descricao: 'Proteção completa para veículos e frotas',
    icon: Car,
    color: 'orange',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    iconColor: 'text-orange-500',
    badgeBg: 'bg-orange-100 text-orange-800',
  },
  VIAGEM: {
    label: 'Viagem',
    descricao: 'Cobertura nacional e internacional para viagens',
    icon: Plane,
    color: 'sky',
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    iconColor: 'text-sky-500',
    badgeBg: 'bg-sky-100 text-sky-800',
  },
  RESIDENCIAL: {
    label: 'Residencial',
    descricao: 'Proteção completa para sua residência',
    icon: Home,
    color: 'green',
    bg: 'bg-green-50',
    border: 'border-green-200',
    iconColor: 'text-green-500',
    badgeBg: 'bg-green-100 text-green-800',
  },
  PET_SAUDE: {
    label: 'Pet Saúde',
    descricao: 'Cuidados veterinários para seu pet',
    icon: PawPrint,
    color: 'pink',
    bg: 'bg-pink-50',
    border: 'border-pink-200',
    iconColor: 'text-pink-500',
    badgeBg: 'bg-pink-100 text-pink-800',
  },
  EMPRESARIAL: {
    label: 'Empresarial',
    descricao: 'Proteção para patrimônio e operações empresariais',
    icon: Building2,
    color: 'purple',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    iconColor: 'text-purple-500',
    badgeBg: 'bg-purple-100 text-purple-800',
  },
};

const SelectSegmento = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [temEmpresa, setTemEmpresa] = useState(false);
  const [apolicesPorSegmento, setApolicesPorSegmento] = useState({});

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        // Verifica se tem empresa vinculada (para Saúde/Vida/Odonto)
        if (user.empresa_matriz_id) {
          const { data: emp } = await supabaseClient
            .from('empresas')
            .select('id')
            .or(`id.eq.${user.empresa_matriz_id},empresa_matriz_id.eq.${user.empresa_matriz_id}`)
            .limit(1);
          setTemEmpresa((emp || []).length > 0);
        }

        // Busca apólices dos outros segmentos
        if (user.empresa_matriz_id) {
          const apolices = await apolicesService.getApolicesByMatriz(user.empresa_matriz_id);
          const agrupadas = apolices.reduce((acc, ap) => {
            if (!acc[ap.segmento]) acc[ap.segmento] = [];
            acc[ap.segmento].push(ap);
            return acc;
          }, {});
          setApolicesPorSegmento(agrupadas);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const handleSelectSegmento = (segmento) => {
    if (segmento === 'SAUDE_VIDA_ODONTO') {
      navigate('/select-company');
    } else {
      navigate(`/select-apolice/${segmento}`);
    }
  };

  // Monta lista de segmentos disponíveis
  const segmentosDisponiveis = [];
  if (temEmpresa) segmentosDisponiveis.push('SAUDE_VIDA_ODONTO');
  Object.keys(SEGMENTOS).forEach(seg => {
    if (apolicesPorSegmento[seg]?.length > 0) segmentosDisponiveis.push(seg);
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

  return (
    <>
      <Helmet>
        <title>Selecionar Segmento - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen flex flex-col items-start justify-start bg-soft-gradient p-4 sm:p-8 text-gray-800">
        <div className="w-full flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <img src={logoUrl} alt="Ágil Seguros" className="h-8 w-auto" />
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Selecione o Segmento</h1>
              <p className="text-gray-500 text-sm">Olá, {user?.email}</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-gray-900">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        {segmentosDisponiveis.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Nenhum seguro ativo</h2>
            <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
            <Button onClick={handleLogout} className="mt-6" variant="outline">
              <LogOut className="mr-2 h-4 w-4" /> Sair
            </Button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {segmentosDisponiveis.map((seg) => {
              const config = SEGMENTO_CONFIG[seg];
              const Icon = config.icon;
              const count = seg === 'SAUDE_VIDA_ODONTO' ? null : (apolicesPorSegmento[seg]?.length || 0);

              // Verificar se alguma apólice está vencendo
              const apolices = apolicesPorSegmento[seg] || [];
              const vencendo = apolices.some(ap => {
                const status = apolicesService.getStatusApolice(ap.vigencia_fim);
                return status.color === 'yellow' || status.color === 'red';
              });

              return (
                <motion.div
                  key={seg}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div
                    onClick={() => handleSelectSegmento(seg)}
                    className={`relative w-full h-full p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer border-2 ${config.border} hover:scale-[1.02]`}
                  >
                    {vencendo && (
                      <div className="absolute top-0 right-0 -mt-2 -mr-2">
                        <Badge className="bg-yellow-500 text-white rounded-full px-2 text-xs shadow-sm">!</Badge>
                      </div>
                    )}

                    <div>
                      <div className={`inline-flex p-3 rounded-xl ${config.bg} mb-4`}>
                        <Icon className={`h-7 w-7 ${config.iconColor}`} />
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 mb-1">{config.label}</h2>
                      <p className="text-sm text-gray-500">{config.descricao}</p>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                      {count !== null ? (
                        <Badge className={config.badgeBg}>
                          {count} {count === 1 ? 'apólice' : 'apólices'}
                        </Badge>
                      ) : (
                        <Badge className={config.badgeBg}>Planos ativos</Badge>
                      )}
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </>
  );
};

export default SelectSegmento;
