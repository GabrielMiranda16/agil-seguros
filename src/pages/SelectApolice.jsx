import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { LogOut, ArrowLeft, FileText, CalendarDays, Building, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_STYLE = {
  green:  { badge: 'bg-green-100 text-green-800 border-green-200',  label: 'Ativa' },
  yellow: { badge: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Vencendo em breve' },
  red:    { badge: 'bg-red-100 text-red-800 border-red-200',         label: 'Vencida' },
  gray:   { badge: 'bg-gray-100 text-gray-600 border-gray-200',      label: 'Sem vigência' },
};

const SelectApolice = () => {
  const { segmento } = useParams();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolices, setApolices] = useState([]);

  const segConfig = SEGMENTOS[segmento];

  useEffect(() => {
    if (!user?.empresa_matriz_id) { setLoading(false); return; }

    apolicesService.getApolicesByMatriz(user.empresa_matriz_id)
      .then(all => setApolices(all.filter(ap => ap.segmento === segmento)))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user, segmento]);

  const handleLogout = () => { logout(); navigate('/login'); };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Selecionar Apólice - {segConfig?.label || segmento} - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen flex flex-col items-start bg-soft-gradient p-4 sm:p-8 text-gray-800">
        <div className="w-full flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/select-segmento')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <img src={logoUrl} alt="Ágil Seguros" className="h-8 w-auto" />
            <div>
              <h1 className="text-2xl font-bold">{segConfig?.label || segmento}</h1>
              <p className="text-sm text-gray-500">Selecione a apólice</p>
            </div>
          </div>
          <Button variant="ghost" onClick={handleLogout} className="text-gray-600">
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>

        {apolices.length === 0 ? (
          <div className="w-full flex flex-col items-center justify-center py-24 text-center">
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-600">Nenhuma apólice encontrada</h2>
            <p className="text-gray-400 mt-2">Entre em contato com o administrador.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
            className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {apolices.map((apolice) => {
              const status = apolicesService.getStatusApolice(apolice.vigencia_fim);
              const style = STATUS_STYLE[status.color];

              return (
                <motion.div
                  key={apolice.id}
                  variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                >
                  <div
                    onClick={() => navigate(`/apolice/${apolice.id}`)}
                    className="relative w-full p-6 rounded-xl bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col gap-4 cursor-pointer border border-gray-200 hover:scale-[1.02]"
                  >
                    {(status.color === 'yellow' || status.color === 'red') && (
                      <div className="absolute top-3 right-3">
                        <AlertTriangle className={`h-5 w-5 ${status.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                      </div>
                    )}

                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Apólice</p>
                      <p className="text-lg font-bold text-gray-800">
                        {apolice.numero_apolice || '—'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4 text-gray-400" />
                        <p className="text-sm text-gray-600 font-medium">{apolice.seguradora || '—'}</p>
                      </div>
                    </div>

                    <div className="border-t border-gray-100 pt-3 space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <CalendarDays className="h-4 w-4 text-gray-400" />
                        <span>{formatDate(apolice.vigencia_inicio)} → {formatDate(apolice.vigencia_fim)}</span>
                      </div>
                      {status.dias !== undefined && status.color !== 'green' && (
                        <p className="text-xs text-gray-400">
                          {status.color === 'red'
                            ? `Venceu há ${Math.abs(status.dias)} dias`
                            : `Vence em ${status.dias} dias`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <Badge className={`border ${style.badge}`}>{style.label}</Badge>
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

export default SelectApolice;
