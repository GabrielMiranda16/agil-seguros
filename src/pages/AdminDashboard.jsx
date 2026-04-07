import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Plus, Trash2, ArrowRight, Search, Loader2, GitBranchPlus, Eye, Edit, Users, ChevronDown, ChevronUp, FileClock, DollarSign, FileText, Car, Plane, Home, PawPrint, Building2, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask, applyCpfMask } from '@/lib/masks';

// Services
import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { authService } from '@/services/authService';
import { apolicesService, SEGMENTOS } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';

const SEGMENTO_ICONS = { AUTO_FROTA: Car, VIAGEM: Plane, RESIDENCIAL: Home, PET_SAUDE: PawPrint, EMPRESARIAL: Building2 };

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedCompanyId, setSelectedCompanyId } = useCompany();
  
  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNewEmpresaModalOpen, setIsNewEmpresaModalOpen] = useState(false);
  const [isEditEmpresaModalOpen, setIsEditEmpresaModalOpen] = useState(false);
  
  const [expandedMatrizId, setExpandedMatrizId] = useState(null);
  const [showFilialForm, setShowFilialForm] = useState(false);
  const [isAddFilialModalOpen, setIsAddFilialModalOpen] = useState(false);

  const [newEmpresa, setNewEmpresa] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', senha_cliente: '' });
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [filialFormData, setFilialFormData] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
  const [editingFilial, setEditingFilial] = useState(null);
  const [selectedMatriz, setSelectedMatriz] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Apólices state
  const [apolices, setApolices] = useState([]);
  const [isApoliceModalOpen, setIsApoliceModalOpen] = useState(false);
  const [editingApolice, setEditingApolice] = useState(null);
  const [selectedEmpresaApolice, setSelectedEmpresaApolice] = useState('');
  const [apoliceForm, setApoliceForm] = useState({
    segmento: '', numero_apolice: '', seguradora: '', vigencia_inicio: '',
    vigencia_fim: '', valor_premio: '', descricao: '',
  });
  const [contratoFile, setContratoFile] = useState(null);

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [
        empresasData,
        beneficiariosData,
        solicitacoesData,
        usersData
      ] = await Promise.all([
        empresasService.getEmpresas(),
        beneficiariosService.getAllBeneficiarios(),
        solicitacoesService.getAllSolicitacoes(),
        supabaseClient.from('users').select('*')
      ]);

      if (usersData.error) throw usersData.error;

      setEmpresas(empresasData);
      setBeneficiarios(beneficiariosData);
      setSolicitacoes(solicitacoesData);
      setUsers(usersData.data || []);

      const apolicesData = await apolicesService.getAllApolices();
      setApolices(apolicesData);
    } catch (error) {
      console.error("Error fetching admin dashboard data:", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const matrizes = useMemo(() => empresas.filter(e => e.tipo === 'MATRIZ'), [empresas]);
  const filiais = useMemo(() => empresas.filter(e => e.tipo === 'FILIAL'), [empresas]);

  // Inicializa a empresa selecionada se não houver nenhuma
  useEffect(() => {
    if (!selectedCompanyId && matrizes.length > 0) {
      setSelectedCompanyId(matrizes[0].id);
    }
  }, [selectedCompanyId, matrizes, setSelectedCompanyId]);

  // Filtra beneficiários baseado na empresa selecionada (Apenas a selecionada)
  const beneficiariosFiltrados = useMemo(() => { 
    if (!selectedCompanyId) return []; 
    const selectedId = String(selectedCompanyId); 
    return beneficiarios.filter(b => !b.data_exclusao && String(b.empresa_id) === selectedId); 
  }, [selectedCompanyId, beneficiarios]);

  const getSolicitacoesPendentesCount = (empresaId) => {
    if (!empresaId) return 0;
    const id = Number(empresaId);
    return solicitacoes.filter(s => Number(s.empresa_id) === id && s.status === 'PENDENTE').length;
  };

  const getFiliaisForMatriz = (matrizId) => filiais.filter(f => f.empresa_matriz_id === matrizId);

  const getSolicitacoesPendentesFiliais = (matrizId) => {
    const filiaisDaMatriz = getFiliaisForMatriz(matrizId);
    return filiaisDaMatriz.map(f => f.id).reduce((acc, filialId) => {
        return acc + getSolicitacoesPendentesCount(filialId);
    }, 0);
  };

  const NotifBadge = ({ count }) => {
    if (!count || count <= 0) return null;
    return (<span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[11px] font-bold flex items-center justify-center leading-none shadow">{count > 99 ? '99+' : count}</span>);
  };

  const handleInputChange = (e, setter) => {
    const { id, value } = e.target;
    setter(prev => ({ ...prev, [id]: id === 'cnpj' ? applyCnpjMask(value) : value }));
  };

  // --- Apólices ---
  const apolicesFiltradas = useMemo(() => {
    if (!selectedEmpresaApolice) return apolices;
    return apolices.filter(a => String(a.empresa_id) === String(selectedEmpresaApolice));
  }, [apolices, selectedEmpresaApolice]);

  const openNewApolice = () => {
    setEditingApolice(null);
    setApoliceForm({ segmento: '', numero_apolice: '', seguradora: '', vigencia_inicio: '', vigencia_fim: '', valor_premio: '', descricao: '' });
    setContratoFile(null);
    setIsApoliceModalOpen(true);
  };

  const openEditApolice = (ap) => {
    setEditingApolice(ap);
    setApoliceForm({
      segmento: ap.segmento || '',
      numero_apolice: ap.numero_apolice || '',
      seguradora: ap.seguradora || '',
      vigencia_inicio: ap.vigencia_inicio || '',
      vigencia_fim: ap.vigencia_fim || '',
      valor_premio: ap.valor_premio || '',
      descricao: ap.descricao || '',
    });
    setContratoFile(null);
    setIsApoliceModalOpen(true);
  };

  const handleSaveApolice = async (e) => {
    e.preventDefault();
    if (!selectedEmpresaApolice) return toast({ variant: 'destructive', title: 'Selecione uma empresa' });
    if (!apoliceForm.segmento) return toast({ variant: 'destructive', title: 'Selecione o segmento' });
    setIsSubmitting(true);
    try {
      const payload = {
        ...apoliceForm,
        empresa_id: Number(selectedEmpresaApolice),
        valor_premio: apoliceForm.valor_premio ? Number(apoliceForm.valor_premio) : null,
        ativo: true,
      };

      let saved;
      if (editingApolice) {
        saved = await apolicesService.updateApolice(editingApolice.id, payload);
        setApolices(prev => prev.map(a => a.id === saved.id ? saved : a));
      } else {
        saved = await apolicesService.createApolice(payload);
        setApolices(prev => [saved, ...prev]);
      }

      if (contratoFile) {
        const url = await apolicesService.uploadContrato(contratoFile, saved.id);
        const updated = await apolicesService.updateApolice(saved.id, { contrato_url: url });
        setApolices(prev => prev.map(a => a.id === updated.id ? updated : a));
      }

      toast({ title: 'Sucesso', description: editingApolice ? 'Apólice atualizada.' : 'Apólice criada.' });
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
  
  const validateAndSubmitMatriz = async (e) => {
    e.preventDefault();
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    
    const { razao_social, cnpj, email_cliente, senha_cliente } = newEmpresa;
    if (!razao_social || !cnpj || !email_cliente || !senha_cliente) return toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos para a matriz são obrigatórios.' });
    
    if (users.some(u => u.email === email_cliente) || empresas.some(emp => emp.cnpj === cnpj)) return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail ou CNPJ já cadastrado.' });
    
    setIsSubmitting(true);
    try {
      const newMatrizData = { tipo: 'MATRIZ', empresa_matriz_id: null, ...newEmpresa, data_cadastro: new Date().toISOString() };
      
      // Remove password fields from empresa data before creating
      const { email_cliente: _, senha_cliente: __, ...empresaPayload } = newMatrizData;
      // Re-add email for storage in empresa (legacy requirement? schema has email_cliente)
      empresaPayload.email_cliente = email_cliente;

      const createdEmpresa = await empresasService.createEmpresa(empresaPayload);
      
      const newClientUser = {
        email: email_cliente,
        password: senha_cliente,
        perfil: 'CLIENTE',
        empresa_matriz_id: createdEmpresa.id,
        ativo: true
      };
      const createdUser = await authService.createUser(newClientUser);
      
      setEmpresas([...empresas, createdEmpresa]);
      setUsers([...users, createdUser]);
      
      toast({ title: 'Sucesso', description: 'Empresa matriz e cliente criados.' });
      setIsNewEmpresaModalOpen(false);
      setNewEmpresa({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', senha_cliente: '' });
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar empresa.' });
    } finally {
       setIsSubmitting(false);
    }
  };
  
  const validateAndSubmitEditMatriz = async (e) => {
    e.preventDefault();
    if (!canManage || !editingEmpresa) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    
    const { email_cliente, senha_cliente } = editingEmpresa;
    if (!email_cliente) return toast({ variant: 'destructive', title: 'Erro', description: 'O e-mail do cliente é obrigatório.' });
    
    const clientUser = users.find(u => u.empresa_matriz_id === editingEmpresa.id);
    if (!clientUser) return toast({ variant: 'destructive', title: 'Erro', description: 'Usuário cliente não encontrado.' });
    
    if (users.some(u => u.email === email_cliente && u.id !== clientUser.id)) return toast({ variant: 'destructive', title: 'Erro', description: 'Este e-mail já está em uso por outro cliente.' });
    
    setIsSubmitting(true);
    try {
        const updatePayload = { email: email_cliente };
        if (senha_cliente) updatePayload.password = senha_cliente;
        
        await authService.updateUser(clientUser.id, updatePayload);
        
        // Also update email in empresa table if needed
        await empresasService.updateEmpresa(editingEmpresa.id, { email_cliente });

        setUsers(prevUsers => prevUsers.map(u => u.id === clientUser.id ? { ...u, ...updatePayload } : u));
        setEmpresas(prev => prev.map(e => e.id === editingEmpresa.id ? { ...e, email_cliente } : e));
        
        toast({ title: 'Sucesso', description: 'Credenciais do cliente atualizadas.' });
        setIsEditEmpresaModalOpen(false);
        setEditingEmpresa(null);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar dados.' });
    } finally {
       setIsSubmitting(false);
    }
  };

  const validateAndSubmitFilial = async (e) => {
    e.preventDefault();
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    
    const { razao_social, cnpj } = filialFormData;
    if (!razao_social || !cnpj) return toast({ variant: 'destructive', title: 'Erro', description: 'Razão Social e CNPJ da filial são obrigatórios.' });
    if (empresas.some(emp => emp.cnpj === cnpj && emp.id !== editingFilial?.id)) return toast({ variant: 'destructive', title: 'Erro', description: 'CNPJ já cadastrado.' });
    
    setIsSubmitting(true);
    try {
        if (editingFilial) {
            await empresasService.updateEmpresa(editingFilial.id, filialFormData);
            setEmpresas(prev => prev.map(emp => emp.id === editingFilial.id ? { ...emp, ...filialFormData } : emp));
            toast({ title: 'Sucesso', description: 'Filial atualizada.' });
        } else {
            const newFilialData = {
                tipo: 'FILIAL',
                empresa_matriz_id: selectedMatriz.id,
                ...filialFormData,
                data_cadastro: new Date().toISOString()
            };
            const createdFilial = await empresasService.createEmpresa(newFilialData);
            setEmpresas([...empresas, createdFilial]);
            toast({ title: 'Sucesso', description: 'Filial adicionada.' });
        }
        setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
        setEditingFilial(null);
        setShowFilialForm(false);
        setIsAddFilialModalOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar filial.' });
    } finally {
       setIsSubmitting(false);
    }
  };
  
  const deleteMatriz = async (id) => {
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    if (filiais.some(f => f.empresa_matriz_id === id)) return toast({ variant: "destructive", title: "Ação Bloqueada", description: "Exclua todas as filiais antes de excluir a matriz." });
    
    try {
        const userToDelete = users.find(u => u.empresa_matriz_id === id);
        if (userToDelete) await authService.deleteUser(userToDelete.id);
        
        await empresasService.deleteEmpresa(id);
        
        setEmpresas(empresas.filter(e => e.id !== id));
        setUsers(users.filter(u => u.empresa_matriz_id !== id));
        setBeneficiarios(beneficiarios.filter(b => b.empresa_id !== id));
        toast({ title: 'Sucesso', description: 'Empresa matriz excluída.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir matriz.' });
    }
  };

  const deleteFilial = async (id) => {
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    
    try {
        const filiaisBeneficiarios = beneficiarios.filter(b => b.empresa_id === id);
        for (const ben of filiaisBeneficiarios) {
            await beneficiariosService.deleteBeneficiario(ben.id);
        }
        
        await empresasService.deleteEmpresa(id);
        
        const filiaisBeneficiariosIds = filiaisBeneficiarios.map(b => b.id);
        setBeneficiarios(beneficiarios.filter(b => !filiaisBeneficiariosIds.includes(b.id)));
        setEmpresas(empresas.filter(e => e.id !== id));
        toast({ title: 'Sucesso', description: 'Filial e seus beneficiários foram excluídos.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir filial.' });
    }
  };

  const openEditModal = (matriz) => {
    if (!canManage) return;
    const clientUser = users.find(u => u.empresa_matriz_id === matriz.id);
    setEditingEmpresa({ ...matriz, email_cliente: clientUser?.email || '', senha_cliente: '' });
    setIsEditEmpresaModalOpen(true);
  };
  
  const toggleExpandMatriz = (matriz) => {
    setSelectedMatriz(matriz);
    setExpandedMatrizId(prev => (prev === matriz.id ? null : matriz.id));
    setShowFilialForm(false);
    setEditingFilial(null);
    setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
  };

  const openEditFilialForm = (filial) => {
    setEditingFilial(filial);
    setFilialFormData(filial);
    setShowFilialForm(true);
  };

  const openAddFilialPopup = (matriz) => {
    setSelectedMatriz(matriz);
    setEditingFilial(null);
    setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
    setIsAddFilialModalOpen(true);
  };

  const goToSolicitacoes = (empresaId) => { setSelectedCompanyId(Number(empresaId)); navigate('/solicitacoes'); };
  const goToCoparticipacao = (empresaId) => { setSelectedCompanyId(Number(empresaId)); navigate('/coparticipacao'); };
  
  const filteredMatrizes = useMemo(() =>
    matrizes.filter(e => (e.nome_fantasia || '').toLowerCase().includes(searchTerm.toLowerCase()) || (e.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase()) || e.cnpj.includes(searchTerm)), [matrizes, searchTerm]);

  return (
    <>
      <Helmet><title>Dashboard ADM - Seguros Ágil</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }} className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><h1 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard do Administrador</h1></div>
          
          <Card> 
            <CardHeader>
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <CardTitle>Gestão de Empresas Matrizes</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto"><div className="relative w-full md:w-64"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" /><Input placeholder="Buscar por nome ou CNPJ..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>{canManage && <Button className="whitespace-nowrap w-full md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white" onClick={() => setIsNewEmpresaModalOpen(true)}><Plus className="mr-2 h-4 w-4" /> Nova Empresa</Button>}</div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24" />) :
                  filteredMatrizes.length > 0 ? filteredMatrizes.map(matriz => (
                    <div key={matriz.id} className="flex flex-col p-4 bg-gray-50 rounded-lg border transition-all hover:shadow-md gap-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                        <div className="flex items-center gap-4"><div className="hidden sm:block bg-blue-100 p-3 rounded-lg"><Building className="h-6 w-6 text-blue-600" /></div><div><p className="font-bold text-lg text-gray-800">{matriz.nome_fantasia || matriz.razao_social}</p><p className="text-sm text-gray-600">CNPJ Matriz: {applyCnpjMask(matriz.cnpj)}</p><p className="text-sm text-gray-600 font-semibold">{getFiliaisForMatriz(matriz.id).length} filial(is)</p></div></div>
                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end"><Button variant="outline" size="sm" className="relative" onClick={() => toggleExpandMatriz(matriz)}>{expandedMatrizId === matriz.id ? (<><ChevronUp className="mr-2 h-4 w-4" /> Ocultar Filiais</>) : (<><ChevronDown className="mr-2 h-4 w-4" /> Ver Filiais</>)}<NotifBadge count={getSolicitacoesPendentesFiliais(matriz.id)} /></Button><Button variant="outline" size="sm" onClick={() => navigate(`/cliente/${matriz.id}`)} className="flex-1 sm:flex-none">Acessar <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" size="sm" className="relative" onClick={() => goToSolicitacoes(matriz.id)}><FileClock className="mr-2 h-4 w-4" />Solicitações<NotifBadge count={getSolicitacoesPendentesCount(matriz.id)} /></Button><Button variant="outline" size="sm" onClick={() => goToCoparticipacao(matriz.id)}><DollarSign className="mr-2 h-4 w-4" />Coparticipação</Button>{canManage && (<><Button variant="outline" size="icon" onClick={() => openEditModal(matriz)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Isso excluirá permanentemente a empresa matriz e o seu usuário cliente. Esta ação não pode ser desfeita e só é permitida se não houver filiais.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteMatriz(matriz.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>)}</div>
                      </div>

                      {expandedMatrizId === matriz.id && (
                        <div className="w-full mt-2 pt-3 border-t">
                          <div className="flex items-center justify-between mb-3"><p className="text-sm font-semibold text-gray-700">Filiais cadastradas</p>{canManage && (<Button size="sm" variant="outline" onClick={() => openAddFilialPopup(matriz)}><GitBranchPlus className="mr-2 h-4 w-4" />Adicionar Filial</Button>)}</div>
                          <div className="space-y-2">{getFiliaisForMatriz(matriz.id).length > 0 ? (getFiliaisForMatriz(matriz.id).map((filial) => (<div key={filial.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-gray-50 rounded-lg border"><div><p className="font-semibold">{filial.nome_fantasia || filial.razao_social}</p><p className="text-xs text-gray-600">{applyCnpjMask(filial.cnpj)}</p></div><div className="flex flex-wrap items-center gap-2 justify-end"><Button variant="outline" size="sm" onClick={() => navigate(`/cliente/${filial.id}`)}>Entrar <ArrowRight className="ml-2 h-4 w-4" /></Button><Button variant="outline" size="sm" className="relative" onClick={() => goToSolicitacoes(filial.id)}><FileClock className="mr-2 h-4 w-4" />Solicitações<NotifBadge count={getSolicitacoesPendentesCount(filial.id)} /></Button><Button variant="outline" size="sm" onClick={() => goToCoparticipacao(filial.id)}><DollarSign className="mr-2 h-4 w-4" />Coparticipação</Button>{canManage && (<><Button variant="outline" size="icon" onClick={() => openEditFilialForm(filial)}><Edit className="h-4 w-4" /></Button><AlertDialog><AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão de Filial</AlertDialogTitle><AlertDialogDescription>Isso excluirá a filial e TODOS os seus beneficiários. Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => deleteFilial(filial.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></>)}</div></div>))) : (<p className="text-sm text-gray-500">Nenhuma filial cadastrada.</p>)}</div>
                          {showFilialForm && selectedMatriz?.id === matriz.id && (
                            <div className="mt-4 p-4 rounded-lg border bg-white">
                              <h4 className="font-semibold mb-3">{editingFilial ? 'Editar Filial' : 'Adicionar Filial'}</h4>
                              <form onSubmit={validateAndSubmitFilial} className="space-y-4"><div><Label htmlFor="razao_social_filial">Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label htmlFor="nome_fantasia_filial">Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label htmlFor="cnpj_filial">CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label htmlFor="endereco_completo_filial">Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setShowFilialForm(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{editingFilial ? (<><Edit className="mr-2 h-4 w-4" />Salvar Alterações</>) : (<><GitBranchPlus className="mr-2 h-4 w-4" />Adicionar Filial</>)}</Button></div></form>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )) : <p className="text-center text-gray-500 py-8">Nenhuma empresa encontrada.</p>
                }
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white border-blue-100 shadow-sm"><CardHeader className="pb-3"><CardTitle className="text-lg font-medium text-gray-700">Selecione uma Empresa para Visualizar Dados</CardTitle></CardHeader><CardContent><Select value={selectedCompanyId ? String(selectedCompanyId) : ""} onValueChange={(value) => setSelectedCompanyId(Number(value))}><SelectTrigger className="w-full md:w-[400px]"><SelectValue placeholder="Selecione matriz ou filial" /></SelectTrigger><SelectContent>{matrizes.map((matriz) => (<React.Fragment key={matriz.id}><SelectItem value={String(matriz.id)} className="font-semibold">Matriz: {matriz.nome_fantasia || matriz.razao_social} - {applyCnpjMask(matriz.cnpj)}</SelectItem>{getFiliaisForMatriz(matriz.id).map((filial) => (<SelectItem key={filial.id} value={String(filial.id)} className="pl-6">↳ Filial: {filial.nome_fantasia || filial.razao_social} - {applyCnpjMask(filial.cnpj)}</SelectItem>))}</React.Fragment>))}</SelectContent></Select></CardContent></Card>

           <Card><CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Beneficiários (Visão Geral - {empresas.find(e => e.id === selectedCompanyId)?.nome_fantasia || empresas.find(e => e.id === selectedCompanyId)?.razao_social || 'Nenhuma Selecionada'})</CardTitle></CardHeader><CardContent>{beneficiariosFiltrados.length === 0 ? (<div className="text-center py-8 text-gray-500">Nenhum beneficiário encontrado para a empresa selecionada (para a empresa selecionada, se for matriz).</div>) : (<div className="rounded-md border"><div className="w-full overflow-auto"><table className="w-full text-sm text-left"><thead className="bg-gray-50 text-gray-700 font-medium border-b"><tr><th className="p-3">Nome</th><th className="p-3">CPF</th><th className="p-3">Tipo</th><th className="p-3">Empresa</th></tr></thead><tbody>{beneficiariosFiltrados.map((beneficiario) => { const empresaDoBeneficiario = empresas.find(e => e.id === beneficiario.empresa_id); return (<tr key={beneficiario.id} className="border-b last:border-0 hover:bg-gray-50"><td className="p-3 font-medium">{beneficiario.nome_completo || beneficiario.nome || 'Sem nome'}</td><td className="p-3">{applyCpfMask(beneficiario.cpf)}</td><td className="p-3"><span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${beneficiario.parentesco === 'TITULAR' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>{beneficiario.parentesco}</span></td><td className="p-3 text-gray-500">{empresaDoBeneficiario?.nome_fantasia || empresaDoBeneficiario?.razao_social || 'N/A'}<span className="ml-1 text-xs text-gray-400">({empresaDoBeneficiario?.tipo})</span></td></tr>); })}</tbody></table></div></div>)}</CardContent></Card>

          {/* --- Gestão de Apólices --- */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Gestão de Apólices</CardTitle>
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <Select value={selectedEmpresaApolice} onValueChange={setSelectedEmpresaApolice}>
                    <SelectTrigger className="w-full md:w-64"><SelectValue placeholder="Filtrar por empresa" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Todas as empresas</SelectItem>
                      {matrizes.map(m => (
                        <React.Fragment key={m.id}>
                          <SelectItem value={String(m.id)}>{m.nome_fantasia || m.razao_social}</SelectItem>
                          {filiais.filter(f => f.empresa_matriz_id === m.id).map(f => (
                            <SelectItem key={f.id} value={String(f.id)} className="pl-6">↳ {f.nome_fantasia || f.razao_social}</SelectItem>
                          ))}
                        </React.Fragment>
                      ))}
                    </SelectContent>
                  </Select>
                  {canManage && (
                    <Button className="whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 text-white" onClick={openNewApolice}>
                      <Plus className="mr-2 h-4 w-4" /> Nova Apólice
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />)}</div>
              ) : apolicesFiltradas.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Nenhuma apólice cadastrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apolicesFiltradas.map(ap => {
                    const status = apolicesService.getStatusApolice(ap.vigencia_fim);
                    const Icon = SEGMENTO_ICONS[ap.segmento] || FileText;
                    const empresa = empresas.find(e => e.id === ap.empresa_id);
                    const statusColors = { green: 'bg-green-100 text-green-800', yellow: 'bg-yellow-100 text-yellow-800', red: 'bg-red-100 text-red-800', gray: 'bg-gray-100 text-gray-600' };
                    return (
                      <div key={ap.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg border hover:shadow-sm transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className="bg-white p-2 rounded-lg border"><Icon className="h-5 w-5 text-gray-600" /></div>
                          <div>
                            <p className="font-semibold text-gray-800">Apólice {ap.numero_apolice || '—'} · {ap.seguradora || '—'}</p>
                            <p className="text-xs text-gray-500">{SEGMENTOS[ap.segmento]?.label} · {empresa?.nome_fantasia || empresa?.razao_social || '—'}</p>
                            <p className="text-xs text-gray-400">Vigência: {ap.vigencia_inicio || '—'} → {ap.vigencia_fim || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {(status.color === 'yellow' || status.color === 'red') && <AlertTriangle className={`h-4 w-4 ${status.color === 'red' ? 'text-red-500' : 'text-yellow-500'}`} />}
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[status.color]}`}>{status.label}</span>
                          {canManage && (
                            <>
                              <Button variant="outline" size="icon" onClick={() => openEditApolice(ap)}><Edit className="h-4 w-4" /></Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" size="icon"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader><AlertDialogTitle>Remover Apólice?</AlertDialogTitle><AlertDialogDescription>Esta apólice deixará de aparecer para o cliente.</AlertDialogDescription></AlertDialogHeader>
                                  <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteApolice(ap.id)} className={buttonVariants({ variant: 'destructive' })}>Remover</AlertDialogAction></AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </motion.div>
      </DashboardLayout>

      <Dialog open={isNewEmpresaModalOpen} onOpenChange={setIsNewEmpresaModalOpen}><DialogContent className="sm:max-w-2xl"><DialogHeader><DialogTitle>Nova Empresa (Matriz)</DialogTitle></DialogHeader><form onSubmit={validateAndSubmitMatriz}><div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4"><div><Label htmlFor="razao_social">Razão Social *</Label><Input id="razao_social" value={newEmpresa.razao_social} onChange={e => handleInputChange(e, setNewEmpresa)} /></div><div><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" value={newEmpresa.nome_fantasia} onChange={e => handleInputChange(e, setNewEmpresa)} /></div><div><Label htmlFor="cnpj">CNPJ *</Label><Input id="cnpj" value={newEmpresa.cnpj} onChange={e => handleInputChange(e, setNewEmpresa)} /></div><div><Label htmlFor="endereco_completo">Endereço</Label><Input id="endereco_completo" value={newEmpresa.endereco_completo} onChange={e => handleInputChange(e, setNewEmpresa)} /></div><div className="md:col-span-2 border-t pt-4 mt-2 grid md:grid-cols-2 gap-4"><div><Label htmlFor="email_cliente">E-mail do Cliente *</Label><Input id="email_cliente" type="email" value={newEmpresa.email_cliente} onChange={e => handleInputChange(e, setNewEmpresa)} /></div><div><Label htmlFor="senha_cliente">Senha do Cliente *</Label><Input id="senha_cliente" type="password" value={newEmpresa.senha_cliente} onChange={e => handleInputChange(e, setNewEmpresa)} /></div></div></div><DialogFooter><Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar Empresa</Button></DialogFooter></form></DialogContent></Dialog>
      
      {editingEmpresa && (<Dialog open={isEditEmpresaModalOpen} onOpenChange={setIsEditEmpresaModalOpen}><DialogContent><DialogHeader><DialogTitle>Editar Cliente</DialogTitle><p className="text-sm text-muted-foreground">{editingEmpresa.nome_fantasia || editingEmpresa.razao_social}</p></DialogHeader><form onSubmit={validateAndSubmitEditMatriz}><div className="space-y-4 py-4"><div><Label htmlFor="email_cliente_edit">E-mail do Cliente *</Label><Input id="email_cliente" type="email" value={editingEmpresa.email_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} /></div><div><Label htmlFor="senha_cliente_edit">Nova Senha (opcional)</Label><Input id="senha_cliente" type="password" placeholder="Deixe em branco para manter a atual" value={editingEmpresa.senha_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} /></div></div><DialogFooter><Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar Alterações</Button></DialogFooter></form></DialogContent></Dialog>)}
      {canManage && selectedMatriz && (<Dialog open={isAddFilialModalOpen} onOpenChange={setIsAddFilialModalOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Adicionar Nova Filial</DialogTitle><p className="text-sm text-muted-foreground">{selectedMatriz.nome_fantasia || selectedMatriz.razao_social}</p></DialogHeader><form onSubmit={validateAndSubmitFilial} className="space-y-4"><div><Label>Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label>Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label>CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={e => handleInputChange(e, setFilialFormData)} /></div><div><Label>Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={e => handleInputChange(e, setFilialFormData)} /></div><DialogFooter><Button type="button" variant="outline" onClick={() => setIsAddFilialModalOpen(false)}>Cancelar</Button><Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}<GitBranchPlus className="mr-2 h-4 w-4" />Adicionar Filial</Button></DialogFooter></form></DialogContent></Dialog>)}

      {/* Modal de Apólice */}
      <Dialog open={isApoliceModalOpen} onOpenChange={setIsApoliceModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editingApolice ? 'Editar Apólice' : 'Nova Apólice'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveApolice} className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Empresa *</Label>
                <Select value={selectedEmpresaApolice} onValueChange={setSelectedEmpresaApolice}>
                  <SelectTrigger><SelectValue placeholder="Selecione a empresa" /></SelectTrigger>
                  <SelectContent>
                    {matrizes.map(m => (
                      <React.Fragment key={m.id}>
                        <SelectItem value={String(m.id)}>{m.nome_fantasia || m.razao_social}</SelectItem>
                        {filiais.filter(f => f.empresa_matriz_id === m.id).map(f => (
                          <SelectItem key={f.id} value={String(f.id)} className="pl-6">↳ {f.nome_fantasia || f.razao_social}</SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Segmento *</Label>
                <Select value={apoliceForm.segmento} onValueChange={v => setApoliceForm(p => ({ ...p, segmento: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o segmento" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(SEGMENTOS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Número da Apólice</Label>
                <Input value={apoliceForm.numero_apolice} onChange={e => setApoliceForm(p => ({ ...p, numero_apolice: e.target.value }))} placeholder="Ex: 000123456" />
              </div>
              <div>
                <Label>Seguradora</Label>
                <Input value={apoliceForm.seguradora} onChange={e => setApoliceForm(p => ({ ...p, seguradora: e.target.value }))} placeholder="Ex: SulAmérica" />
              </div>
              <div>
                <Label>Vigência Início</Label>
                <Input type="date" value={apoliceForm.vigencia_inicio} onChange={e => setApoliceForm(p => ({ ...p, vigencia_inicio: e.target.value }))} />
              </div>
              <div>
                <Label>Vigência Fim</Label>
                <Input type="date" value={apoliceForm.vigencia_fim} onChange={e => setApoliceForm(p => ({ ...p, vigencia_fim: e.target.value }))} />
              </div>
              <div>
                <Label>Valor do Prêmio (R$)</Label>
                <Input type="number" step="0.01" value={apoliceForm.valor_premio} onChange={e => setApoliceForm(p => ({ ...p, valor_premio: e.target.value }))} placeholder="0,00" />
              </div>
              <div>
                <Label>Contrato (PDF)</Label>
                <Input type="file" accept=".pdf" onChange={e => setContratoFile(e.target.files?.[0] || null)} />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Input value={apoliceForm.descricao} onChange={e => setApoliceForm(p => ({ ...p, descricao: e.target.value }))} placeholder="Informações adicionais sobre a apólice" />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsApoliceModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingApolice ? 'Salvar Alterações' : 'Criar Apólice'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AdminDashboard;