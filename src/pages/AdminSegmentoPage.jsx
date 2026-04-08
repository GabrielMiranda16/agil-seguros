import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft, ChevronRight, Building, Users, Heart, Car, Plane, Home, PawPrint,
  Building2, Package, Monitor, Plus, Edit, Trash2, Loader2, AlertTriangle,
  FileText, ExternalLink, DollarSign, FileClock, CheckCircle2, Clock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask } from '@/lib/masks';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';

const SEGMENTOS_CONFIG = {
  'saude-vida-odonto': { key: 'SAUDE_VIDA_ODONTO', label: 'Saúde, Vida e Odonto', Icon: Heart,     isSVD: true  },
  'auto-frota':        { key: 'AUTO_FROTA',         label: 'Auto e Frota',          Icon: Car,       isSVD: false },
  'viagem':            { key: 'VIAGEM',              label: 'Viagem',                Icon: Plane,     isSVD: false },
  'residencial':       { key: 'RESIDENCIAL',         label: 'Residencial',           Icon: Home,      isSVD: false },
  'pet-saude':         { key: 'PET_SAUDE',           label: 'Pet Saúde',             Icon: PawPrint,  isSVD: false },
  'empresarial':       { key: 'EMPRESARIAL',         label: 'Empresarial',           Icon: Building2, isSVD: false },
  'cargas':            { key: 'CARGAS',              label: 'Cargas',                Icon: Package,   isSVD: false },
  'equipamentos':      { key: 'EQUIPAMENTOS',        label: 'Equipamentos',          Icon: Monitor,   isSVD: false },
};

const STATUS_COLORS = {
  green:  { badge: 'bg-green-100 text-green-800',  dot: 'bg-green-500'  },
  yellow: { badge: 'bg-yellow-100 text-yellow-800',dot: 'bg-yellow-500' },
  red:    { badge: 'bg-red-100 text-red-800',      dot: 'bg-red-500'    },
  gray:   { badge: 'bg-gray-100 text-gray-600',    dot: 'bg-gray-400'   },
};

const emptyApoliceForm = { numero_apolice: '', seguradora: '', vigencia_inicio: '', vigencia_fim: '', valor_premio: '', descricao: '' };

const AdminSegmentoPage = () => {
  const { matrizId, segmento } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedCompanyId } = useCompany();
  const { toast } = useToast();

  const segConfig = SEGMENTOS_CONFIG[segmento];

  const [matriz, setMatriz] = useState(null);
  const [filiais, setFiliais] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Apolice modal
  const [isApoliceModalOpen, setIsApoliceModalOpen] = useState(false);
  const [editingApolice, setEditingApolice] = useState(null);
  const [apoliceForm, setApoliceForm] = useState(emptyApoliceForm);
  const [apoliceEmpresaId, setApoliceEmpresaId] = useState('');
  const [contratoFile, setContratoFile] = useState(null);

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';
  const isSVD = segConfig?.isSVD;

  useEffect(() => {
    if (!segConfig) { navigate('/admin'); return; }
    const load = async () => {
      try {
        setIsLoading(true);
        const id = Number(matrizId);
        const [todasEmpresas, todasSolicitacoes] = await Promise.all([
          empresasService.getEmpresas(),
          solicitacoesService.getAllSolicitacoes(),
        ]);

        const matrizData = todasEmpresas.find(e => e.id === id && e.tipo === 'MATRIZ');
        if (!matrizData) { navigate('/admin'); return; }
        const filiaisData = todasEmpresas.filter(e => e.tipo === 'FILIAL' && e.empresa_matriz_id === id);
        const todasIds = [id, ...filiaisData.map(f => f.id)];

        setMatriz(matrizData);
        setFiliais(filiaisData);
        setSolicitacoes(todasSolicitacoes.filter(s => todasIds.includes(Number(s.empresa_id))));

        // Always load apólices for all segments (including SVD)
        try {
          const apData = await apolicesService.getApolicesByMatriz(id);
          setApolices(apData.filter(a => a.segmento === segConfig.key));
        } catch (e) {
          console.warn('Tabela apolices não encontrada:', e);
        }

        if (isSVD) {
          const benData = await beneficiariosService.getAllBeneficiarios();
          setBeneficiarios(benData.filter(b => todasIds.includes(b.empresa_id) && !b.data_exclusao));
        }
      } catch (err) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
        navigate(`/admin/cliente/${matrizId}`);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [matrizId, segmento]);

  const getSolicitacoesPendentes = (empresaId) =>
    solicitacoes.filter(s => Number(s.empresa_id) === empresaId && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;

  const getBeneficiariosEmpresa = (empresaId) =>
    beneficiarios.filter(b => b.empresa_id === empresaId);

  const getApolicesEmpresa = (empresaId) =>
    apolices.filter(a => a.empresa_id === empresaId && a.ativo !== false);

  const todasEmpresas = useMemo(() => matriz ? [{ ...matriz, isMatriz: true }, ...filiais.map(f => ({ ...f, isMatriz: false }))] : [], [matriz, filiais]);

  const openNewApolice = (empresaId) => {
    setEditingApolice(null);
    setApoliceForm(emptyApoliceForm);
    setApoliceEmpresaId(String(empresaId));
    setContratoFile(null);
    setIsApoliceModalOpen(true);
  };

  const openEditApolice = (ap) => {
    setEditingApolice(ap);
    setApoliceForm({
      numero_apolice: ap.numero_apolice || '',
      seguradora: ap.seguradora || '',
      vigencia_inicio: ap.vigencia_inicio || '',
      vigencia_fim: ap.vigencia_fim || '',
      valor_premio: ap.valor_premio || '',
      descricao: ap.descricao || '',
    });
    setApoliceEmpresaId(String(ap.empresa_id));
    setContratoFile(null);
    setIsApoliceModalOpen(true);
  };

  const handleSaveApolice = async (e) => {
    e.preventDefault();
    if (!apoliceEmpresaId) return toast({ variant: 'destructive', title: 'Selecione a empresa.' });
    setIsSubmitting(true);
    try {
      const payload = {
        ...apoliceForm,
        segmento: segConfig.key,
        empresa_id: Number(apoliceEmpresaId),
        valor_premio: apoliceForm.valor_premio ? Number(apoliceForm.valor_premio) : null,
        ativo: true,
      };
      // Remove valor_premio and descricao for SVD
      if (isSVD) { delete payload.valor_premio; delete payload.vigencia_inicio; delete payload.vigencia_fim; delete payload.descricao; }

      let saved;
      if (editingApolice) {
        saved = await apolicesService.updateApolice(editingApolice.id, payload);
        setApolices(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        saved = await apolicesService.createApolice(payload);
        setApolices(prev => [saved, ...prev]);
      }

      if (!isSVD && contratoFile) {
        const url = await apolicesService.uploadContrato(contratoFile, saved.id);
        const updated = await apolicesService.updateApolice(saved.id, { contrato_url: url });
        setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
      }

      toast({ title: editingApolice ? 'Apólice atualizada.' : 'Apólice criada.' });
      setIsApoliceModalOpen(false);
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteApolice = async (id) => {
    try {
      await apolicesService.deleteApolice(id);
      setApolices(prev => prev.filter(a => a.id !== id));
      toast({ title: 'Apólice removida.' });
    } catch (err) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message });
    }
  };

  const goToCoparticipacao = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/coparticipacao');
  };

  const goToSolicitacoes = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/solicitacoes');
  };

  if (!segConfig) return null;
  const { Icon, label } = segConfig;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </DashboardLayout>
    );
  }

  if (!matriz) return null;

  return (
    <>
      <Helmet><title>{label} — {matriz.nome_fantasia || matriz.razao_social}</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => navigate('/admin')} className="text-sm text-gray-400 hover:text-gray-700 transition-colors">Clientes</button>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <button onClick={() => navigate(`/admin/cliente/${matrizId}`)} className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
              {matriz.nome_fantasia || matriz.razao_social}
            </button>
            <ChevronRight className="h-4 w-4 text-gray-300" />
            <span className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Icon className="h-4 w-4" /> {label}
            </span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate(`/admin/cliente/${matrizId}`)} className="flex items-center gap-1 text-gray-500 hover:text-gray-800 transition-colors mr-1">
                <ArrowLeft className="h-4 w-4" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">{label}</h1>
            </div>
          </div>

          {/* Empresas */}
          {todasEmpresas.map((empresa) => {
            const pendentes = getSolicitacoesPendentes(empresa.id);
            const empApolices = getApolicesEmpresa(empresa.id);
            const empBeneficiarios = getBeneficiariosEmpresa(empresa.id);

            return (
              <Card key={empresa.id} className="border shadow-sm overflow-hidden">
                {/* Empresa Header */}
                <div className={`px-5 py-3.5 border-b flex items-center justify-between gap-3 ${empresa.isMatriz ? 'bg-[#f0f7ff]' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-2.5">
                    <Building className={`h-4 w-4 ${empresa.isMatriz ? 'text-blue-600' : 'text-gray-500'}`} />
                    <div>
                      <span className="font-semibold text-gray-800 text-sm">{empresa.nome_fantasia || empresa.razao_social}</span>
                      <span className={`ml-2 text-xs font-medium px-1.5 py-0.5 rounded ${empresa.isMatriz ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                        {empresa.isMatriz ? 'Matriz' : 'Filial'}
                      </span>
                    </div>
                    {pendentes > 0 && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">
                        <AlertTriangle className="h-3 w-3" /> {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 hidden sm:block">{applyCnpjMask(empresa.cnpj)}</p>
                </div>

                <CardContent className="pt-4 pb-4">
                  {/* All segments (including SVD): list apólices first */}
                  {isSVD ? (
                    <div className="space-y-2">
                      {empApolices.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma apólice cadastrada. Registre uma apólice para acessar Beneficiários, Solicitações e Coparticipação.</p>
                        </div>
                      ) : (
                        empApolices.map(ap => (
                          <div key={ap.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-blue-50 rounded-xl border border-blue-100 hover:shadow-sm transition-shadow">
                            <div>
                              <p className="font-semibold text-gray-800 text-sm">
                                {ap.numero_apolice ? `Apólice ${ap.numero_apolice}` : 'Apólice sem número'}
                                {ap.seguradora && <span className="ml-1.5 text-gray-500 font-normal">· {ap.seguradora}</span>}
                              </p>
                              <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-3">
                                <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Beneficiários, Solicitações e Coparticipação disponíveis dentro</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button size="sm" className="bg-[#003580] hover:bg-[#002060] text-white" onClick={() => navigate(`/apolice/${ap.id}`)}>
                                Acessar
                              </Button>
                              {canManage && (
                                <>
                                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditApolice(ap)}><Edit className="h-3.5 w-3.5" /></Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover apólice?</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteApolice(ap.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                  </AlertDialog>
                                </>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                      {canManage && (
                        <Button size="sm" variant="outline" className="mt-1 w-full border-dashed" onClick={() => openNewApolice(empresa.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> {empApolices.length === 0 ? 'Registrar Apólice' : 'Nova Apólice'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Other segments: list of apolices */
                    <div className="space-y-2">
                      {empApolices.length === 0 ? (
                        <div className="text-center py-6 text-gray-400">
                          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">Nenhuma apólice cadastrada para esta empresa</p>
                        </div>
                      ) : (
                        empApolices.map(ap => {
                          const status = apolicesService.getStatusApolice(ap.vigencia_fim);
                          const sc = STATUS_COLORS[status.color] || STATUS_COLORS.gray;
                          return (
                            <div key={ap.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-gray-50 rounded-xl border hover:shadow-sm transition-shadow">
                              <div className="flex items-start gap-3">
                                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
                                <div>
                                  <p className="font-semibold text-gray-800 text-sm">
                                    {ap.numero_apolice ? `Apólice ${ap.numero_apolice}` : 'Apólice sem número'}
                                    {ap.seguradora && <span className="ml-1.5 text-gray-500 font-normal">· {ap.seguradora}</span>}
                                  </p>
                                  {(ap.vigencia_inicio || ap.vigencia_fim) && (
                                    <p className="text-xs text-gray-400 mt-0.5">
                                      Vigência: {ap.vigencia_inicio || '—'} → {ap.vigencia_fim || '—'}
                                      {status.dias !== undefined && status.dias >= 0 && (
                                        <span className={`ml-2 font-medium ${status.color === 'yellow' ? 'text-yellow-600' : 'text-green-600'}`}>
                                          ({status.dias} dias)
                                        </span>
                                      )}
                                    </p>
                                  )}
                                  {ap.valor_premio && (
                                    <p className="text-xs text-gray-400">
                                      Prêmio: R$ {Number(ap.valor_premio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {(status.color === 'yellow' || status.color === 'red') && (
                                  <AlertTriangle className={`h-4 w-4 ${status.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />
                                )}
                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sc.badge}`}>{status.label}</span>
                                {ap.contrato_url && (
                                  <a href={ap.contrato_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                                    <ExternalLink className="h-4 w-4" />
                                  </a>
                                )}
                                {canManage && (
                                  <>
                                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => openEditApolice(ap)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild><Button variant="outline" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700"><Trash2 className="h-3.5 w-3.5" /></Button></AlertDialogTrigger>
                                      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Remover apólice?</AlertDialogTitle><AlertDialogDescription>A apólice deixará de aparecer para o cliente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteApolice(ap.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                    </AlertDialog>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      {canManage && (
                        <Button size="sm" variant="outline" className="mt-1 w-full border-dashed" onClick={() => openNewApolice(empresa.id)}>
                          <Plus className="mr-1.5 h-3.5 w-3.5" /> Nova Apólice
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

        </motion.div>
      </DashboardLayout>

      {/* Modal Apólice */}
      <Dialog open={isApoliceModalOpen} onOpenChange={setIsApoliceModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingApolice ? 'Editar Apólice' : 'Nova Apólice'}</DialogTitle>
            <p className="text-sm text-muted-foreground">{label}</p>
          </DialogHeader>
          <form onSubmit={handleSaveApolice} className="space-y-4 py-2">
            {/* Empresa selector */}
            <div>
              <Label>Empresa</Label>
              <select
                className="w-full mt-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                value={apoliceEmpresaId}
                onChange={e => setApoliceEmpresaId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {todasEmpresas.map(emp => (
                  <option key={emp.id} value={String(emp.id)}>
                    {emp.isMatriz ? '(Matriz) ' : '(Filial) '}{emp.nome_fantasia || emp.razao_social}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Número da Apólice</Label>
                <Input value={apoliceForm.numero_apolice} onChange={e => setApoliceForm(p => ({ ...p, numero_apolice: e.target.value }))} placeholder="Ex: 000123456" />
              </div>
              <div>
                <Label>Seguradora</Label>
                <Input value={apoliceForm.seguradora} onChange={e => setApoliceForm(p => ({ ...p, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" />
              </div>
            </div>

            {/* Fields only for non-SVD segments */}
            {!isSVD && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Vigência Início</Label><Input type="date" value={apoliceForm.vigencia_inicio} onChange={e => setApoliceForm(p => ({ ...p, vigencia_inicio: e.target.value }))} /></div>
                  <div><Label>Vigência Fim</Label><Input type="date" value={apoliceForm.vigencia_fim} onChange={e => setApoliceForm(p => ({ ...p, vigencia_fim: e.target.value }))} /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><Label>Valor do Prêmio (R$)</Label><Input type="number" step="0.01" value={apoliceForm.valor_premio} onChange={e => setApoliceForm(p => ({ ...p, valor_premio: e.target.value }))} placeholder="0,00" /></div>
                  <div><Label>Contrato (PDF)</Label><Input type="file" accept=".pdf" onChange={e => setContratoFile(e.target.files?.[0] || null)} /></div>
                </div>
                <div><Label>Observações</Label><Input value={apoliceForm.descricao} onChange={e => setApoliceForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais" /></div>
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApoliceModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingApolice ? 'Salvar' : 'Criar Apólice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminSegmentoPage;
