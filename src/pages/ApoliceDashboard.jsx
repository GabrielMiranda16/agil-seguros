import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { motion } from 'framer-motion';
import {
  ArrowLeft, FileText, CalendarDays, Building, DollarSign,
  Download, AlertTriangle, CheckCircle, Clock, Loader2,
  Car, Plane, Home, PawPrint, Building2, HeartPulse
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const SEGMENTO_ICONS = {
  AUTO_FROTA:  Car,
  VIAGEM:      Plane,
  RESIDENCIAL: Home,
  PET_SAUDE:   PawPrint,
  EMPRESARIAL: Building2,
  SAUDE_VIDA_ODONTO: HeartPulse,
};

const STATUS_CONFIG = {
  green:  { icon: CheckCircle, color: 'text-green-500',  bg: 'bg-green-50',  badge: 'bg-green-100 text-green-800',  label: 'Ativa' },
  yellow: { icon: Clock,       color: 'text-yellow-500', bg: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800', label: 'Vencendo em breve' },
  red:    { icon: AlertTriangle, color: 'text-red-500',  bg: 'bg-red-50',    badge: 'bg-red-100 text-red-800',      label: 'Vencida' },
  gray:   { icon: FileText,    color: 'text-gray-400',   bg: 'bg-gray-50',   badge: 'bg-gray-100 text-gray-600',    label: 'Sem vigência' },
};

const ApoliceDashboard = () => {
  const { apoliceId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [apolice, setApolice] = useState(null);

  useEffect(() => {
    apolicesService.getApolice(apoliceId)
      .then(setApolice)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [apoliceId]);

  const formatDate = (d) => {
    if (!d) return '—';
    try { return format(new Date(d + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }); } catch { return d; }
  };

  const formatCurrency = (v) => {
    if (!v) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  if (!apolice) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-soft-gradient">
        <FileText className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-gray-500">Apólice não encontrada.</p>
        <Button className="mt-4" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  const status = apolicesService.getStatusApolice(apolice.vigencia_fim);
  const statusCfg = STATUS_CONFIG[status.color];
  const StatusIcon = statusCfg.icon;
  const SegIcon = SEGMENTO_ICONS[apolice.segmento] || FileText;
  const segLabel = SEGMENTOS[apolice.segmento]?.label || apolice.segmento;

  return (
    <>
      <Helmet>
        <title>Apólice {apolice.numero_apolice || apoliceId} - Ágil Seguros</title>
      </Helmet>
      <div className="min-h-screen bg-soft-gradient p-4 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="bg-white p-2 rounded-lg shadow-sm">
              <SegIcon className="h-6 w-6 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">{segLabel}</p>
              <h1 className="text-2xl font-bold text-gray-800">
                Apólice {apolice.numero_apolice || '—'}
              </h1>
            </div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-3xl mx-auto space-y-6"
        >
          {/* Status Alert */}
          {(status.color === 'yellow' || status.color === 'red') && (
            <div className={`${statusCfg.bg} border border-${status.color === 'red' ? 'red' : 'yellow'}-200 rounded-xl p-4 flex items-center gap-3`}>
              <StatusIcon className={`h-5 w-5 ${statusCfg.color} flex-shrink-0`} />
              <div>
                <p className={`font-semibold ${statusCfg.color}`}>{statusCfg.label}</p>
                <p className="text-sm text-gray-600">
                  {status.color === 'red'
                    ? `Esta apólice venceu há ${Math.abs(status.dias)} dias. Entre em contato com o administrador.`
                    : `Esta apólice vence em ${status.dias} dias. Entre em contato para renovação.`}
                </p>
              </div>
            </div>
          )}

          {/* Dados Principais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Dados da Apólice
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Número da Apólice</p>
                <p className="font-semibold text-gray-800">{apolice.numero_apolice || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Seguradora</p>
                <div className="flex items-center gap-2">
                  <Building className="h-4 w-4 text-gray-400" />
                  <p className="font-semibold text-gray-800">{apolice.seguradora || '—'}</p>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Status</p>
                <Badge className={statusCfg.badge}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusCfg.label}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Segmento</p>
                <p className="font-semibold text-gray-800">{segLabel}</p>
              </div>
            </CardContent>
          </Card>

          {/* Vigência */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarDays className="h-4 w-4" /> Vigência
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Início</p>
                <p className="font-semibold text-gray-800">{formatDate(apolice.vigencia_inicio)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Término</p>
                <p className={`font-semibold ${status.color === 'red' ? 'text-red-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-gray-800'}`}>
                  {formatDate(apolice.vigencia_fim)}
                </p>
              </div>
              {status.dias !== undefined && (
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Dias restantes</p>
                  <p className={`font-semibold ${status.color === 'red' ? 'text-red-600' : status.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                    {status.color === 'red' ? `Vencida há ${Math.abs(status.dias)} dias` : `${status.dias} dias`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Valor */}
          {apolice.valor_premio && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <DollarSign className="h-4 w-4" /> Valor
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Prêmio</p>
                  <p className="text-2xl font-bold text-gray-800">{formatCurrency(apolice.valor_premio)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Descrição */}
          {apolice.descricao && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 text-sm leading-relaxed">{apolice.descricao}</p>
              </CardContent>
            </Card>
          )}

          {/* Contrato */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Download className="h-4 w-4" /> Contrato
              </CardTitle>
            </CardHeader>
            <CardContent>
              {apolice.contrato_url ? (
                <a href={apolice.contrato_url} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full sm:w-auto">
                    <Download className="mr-2 h-4 w-4" />
                    Baixar Contrato (PDF)
                  </Button>
                </a>
              ) : (
                <p className="text-sm text-gray-400">Nenhum contrato disponível. Entre em contato com o administrador.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default ApoliceDashboard;
