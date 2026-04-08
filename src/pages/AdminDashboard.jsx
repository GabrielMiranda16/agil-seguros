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
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Skeleton } from '@/components/ui/skeleton';
import { Building, Plus, Trash2, ArrowRight, Search, Loader2, GitBranchPlus, Edit, Users, FileText, AlertTriangle, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask } from '@/lib/masks';

import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { authService } from '@/services/authService';
import { apolicesService } from '@/services/apolicesService';
import { supabaseClient } from '@/lib/supabase';

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setSelectedCompanyId } = useCompany();

  const [empresas, setEmpresas] = useState([]);
  const [users, setUsers] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [apolices, setApolices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isNewClienteModalOpen, setIsNewClienteModalOpen] = useState(false);
  const [isEditEmpresaModalOpen, setIsEditEmpresaModalOpen] = useState(false);
  const [isAddFilialModalOpen, setIsAddFilialModalOpen] = useState(false);

  const [newEmpresa, setNewEmpresa] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', senha_cliente: '' });
  const [editingEmpresa, setEditingEmpresa] = useState(null);
  const [filialFormData, setFilialFormData] = useState({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
  const [editingFilial, setEditingFilial] = useState(null);
  const [selectedMatriz, setSelectedMatriz] = useState(null);

  const canManage = user.perfil === 'CEO' || user.perfil === 'ADM';

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [empresasData, beneficiariosData, solicitacoesData, usersData] = await Promise.all([
        empresasService.getEmpresas(),
        beneficiariosService.getAllBeneficiarios(),
        solicitacoesService.getAllSolicitacoes(),
        supabaseClient.from('users').select('*'),
      ]);
      if (usersData.error) throw usersData.error;
      setEmpresas(empresasData);
      setBeneficiarios(beneficiariosData);
      setSolicitacoes(solicitacoesData);
      setUsers(usersData.data || []);
      try {
        const apolicesData = await apolicesService.getAllApolices();
        setApolices(apolicesData);
      } catch (apErr) {
        console.warn('Tabela apolices não encontrada:', apErr);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao carregar dados.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const matrizes = useMemo(() => empresas.filter(e => e.tipo === 'MATRIZ'), [empresas]);
  const filiais = useMemo(() => empresas.filter(e => e.tipo === 'FILIAL'), [empresas]);

  const getFiliaisForMatriz = (matrizId) => filiais.filter(f => f.empresa_matriz_id === matrizId);

  const getSolicitacoesPendentesCount = (empresaId) => {
    const id = Number(empresaId);
    return solicitacoes.filter(s => Number(s.empresa_id) === id && (s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO')).length;
  };

  const getTotalPendentesMatriz = (matrizId) => {
    const fromFiliais = getFiliaisForMatriz(matrizId).reduce((acc, f) => acc + getSolicitacoesPendentesCount(f.id), 0);
    return getSolicitacoesPendentesCount(matrizId) + fromFiliais;
  };

  const totalPendentes = useMemo(() =>
    solicitacoes.filter(s => s.status === 'PENDENTE' || s.status === 'EM PROCESSAMENTO').length,
    [solicitacoes]
  );

  const apolicesAtivas = useMemo(() =>
    apolices.filter(a => {
      if (!a.vigencia_fim) return a.ativo !== false;
      return new Date(a.vigencia_fim) >= new Date() && a.ativo !== false;
    }).length,
    [apolices]
  );

  // Search across: empresa name/CNPJ, filial name/CNPJ, beneficiário name/CPF
  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return matrizes;
    const term = searchTerm.toLowerCase().trim();
    const termNum = term.replace(/\D/g, '');

    const empresaMatches = matrizes.filter(e =>
      (e.nome_fantasia || '').toLowerCase().includes(term) ||
      (e.razao_social || '').toLowerCase().includes(term) ||
      (termNum && e.cnpj.replace(/\D/g, '').includes(termNum))
    );

    const filialMatches = filiais.filter(f =>
      (f.nome_fantasia || '').toLowerCase().includes(term) ||
      (f.razao_social || '').toLowerCase().includes(term) ||
      (termNum && f.cnpj.replace(/\D/g, '').includes(termNum))
    );

    const benefMatches = beneficiarios.filter(b =>
      (b.nome_completo || '').toLowerCase().includes(term) ||
      (termNum && (b.cpf || '').replace(/\D/g, '').includes(termNum))
    );

    const extraMatrizIds = new Set();
    [...filialMatches].forEach(f => {
      if (f.empresa_matriz_id) extraMatrizIds.add(f.empresa_matriz_id);
    });
    benefMatches.forEach(b => {
      const emp = empresas.find(e => e.id === b.empresa_id);
      if (emp) {
        if (emp.tipo === 'MATRIZ') extraMatrizIds.add(emp.id);
        else if (emp.empresa_matriz_id) extraMatrizIds.add(emp.empresa_matriz_id);
      }
    });

    const combined = [...empresaMatches];
    extraMatrizIds.forEach(id => {
      if (!combined.find(e => e.id === id)) {
        const m = matrizes.find(mx => mx.id === id);
        if (m) combined.push(m);
      }
    });

    return combined;
  }, [searchTerm, matrizes, filiais, beneficiarios, empresas]);

  const handleInputChange = (e, setter) => {
    const { id, value } = e.target;
    setter(prev => ({ ...prev, [id]: id === 'cnpj' ? applyCnpjMask(value) : value }));
  };

  const validateAndSubmitMatriz = async (e) => {
    e.preventDefault();
    if (!canManage) return toast({ variant: 'destructive', title: 'Ação não permitida' });
    const { razao_social, cnpj, email_cliente, senha_cliente } = newEmpresa;
    if (!razao_social || !cnpj || !email_cliente || !senha_cliente)
      return toast({ variant: 'destructive', title: 'Erro', description: 'Todos os campos são obrigatórios.' });
    if (users.some(u => u.email === email_cliente) || empresas.some(emp => emp.cnpj === cnpj))
      return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail ou CNPJ já cadastrado.' });
    setIsSubmitting(true);
    try {
      const { email_cliente: _e, senha_cliente: _s, ...empresaPayload } = { tipo: 'MATRIZ', empresa_matriz_id: null, ...newEmpresa, data_cadastro: new Date().toISOString() };
      empresaPayload.email_cliente = email_cliente;
      const createdEmpresa = await empresasService.createEmpresa(empresaPayload);
      const createdUser = await authService.createUser({ email: email_cliente, password: senha_cliente, perfil: 'CLIENTE', empresa_matriz_id: createdEmpresa.id, ativo: true });
      setEmpresas([...empresas, createdEmpresa]);
      setUsers([...users, createdUser]);
      toast({ title: 'Sucesso', description: 'Cliente criado com sucesso.' });
      setIsNewClienteModalOpen(false);
      setNewEmpresa({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '', email_cliente: '', senha_cliente: '' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao criar cliente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmitEditMatriz = async (e) => {
    e.preventDefault();
    if (!canManage || !editingEmpresa) return;
    const { email_cliente, senha_cliente } = editingEmpresa;
    if (!email_cliente) return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail obrigatório.' });
    const clientUser = users.find(u => u.empresa_matriz_id === editingEmpresa.id);
    if (!clientUser) return toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não encontrado.' });
    if (users.some(u => u.email === email_cliente && u.id !== clientUser.id))
      return toast({ variant: 'destructive', title: 'Erro', description: 'E-mail já em uso.' });
    setIsSubmitting(true);
    try {
      const updatePayload = { email: email_cliente };
      if (senha_cliente) updatePayload.password = senha_cliente;
      await authService.updateUser(clientUser.id, updatePayload);
      await empresasService.updateEmpresa(editingEmpresa.id, { email_cliente });
      setUsers(prev => prev.map(u => u.id === clientUser.id ? { ...u, ...updatePayload } : u));
      setEmpresas(prev => prev.map(e => e.id === editingEmpresa.id ? { ...e, email_cliente } : e));
      toast({ title: 'Sucesso', description: 'Acesso do cliente atualizado.' });
      setIsEditEmpresaModalOpen(false);
      setEditingEmpresa(null);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao atualizar.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateAndSubmitFilial = async (e) => {
    e.preventDefault();
    if (!canManage) return;
    const { razao_social, cnpj } = filialFormData;
    if (!razao_social || !cnpj) return toast({ variant: 'destructive', title: 'Erro', description: 'Razão Social e CNPJ são obrigatórios.' });
    if (empresas.some(emp => emp.cnpj === cnpj && emp.id !== editingFilial?.id))
      return toast({ variant: 'destructive', title: 'Erro', description: 'CNPJ já cadastrado.' });
    setIsSubmitting(true);
    try {
      if (editingFilial) {
        await empresasService.updateEmpresa(editingFilial.id, filialFormData);
        setEmpresas(prev => prev.map(emp => emp.id === editingFilial.id ? { ...emp, ...filialFormData } : emp));
        toast({ title: 'Sucesso', description: 'Filial atualizada.' });
      } else {
        const createdFilial = await empresasService.createEmpresa({ tipo: 'FILIAL', empresa_matriz_id: selectedMatriz.id, ...filialFormData, data_cadastro: new Date().toISOString() });
        setEmpresas([...empresas, createdFilial]);
        toast({ title: 'Sucesso', description: 'Filial adicionada.' });
      }
      setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
      setEditingFilial(null);
      setIsAddFilialModalOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao salvar filial.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteMatriz = async (id) => {
    if (!canManage) return;
    if (filiais.some(f => f.empresa_matriz_id === id))
      return toast({ variant: 'destructive', title: 'Ação Bloqueada', description: 'Exclua todas as filiais antes.' });
    try {
      const userToDelete = users.find(u => u.empresa_matriz_id === id);
      if (userToDelete) await authService.deleteUser(userToDelete.id);
      await empresasService.deleteEmpresa(id);
      setEmpresas(empresas.filter(e => e.id !== id));
      setUsers(users.filter(u => u.empresa_matriz_id !== id));
      setBeneficiarios(beneficiarios.filter(b => b.empresa_id !== id));
      toast({ title: 'Cliente excluído.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao excluir.' });
    }
  };

  const openEditModal = (matriz) => {
    if (!canManage) return;
    const clientUser = users.find(u => u.empresa_matriz_id === matriz.id);
    setEditingEmpresa({ ...matriz, email_cliente: clientUser?.email || '', senha_cliente: '' });
    setIsEditEmpresaModalOpen(true);
  };

  const openAddFilialModal = (matriz) => {
    setSelectedMatriz(matriz);
    setEditingFilial(null);
    setFilialFormData({ razao_social: '', nome_fantasia: '', cnpj: '', endereco_completo: '' });
    setIsAddFilialModalOpen(true);
  };

  const goToSolicitacoes = (empresaId) => {
    setSelectedCompanyId(Number(empresaId));
    navigate('/solicitacoes');
  };

  return (
    <>
      <Helmet><title>Dashboard ADM - Seguros Ágil</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Clientes</h1>
            {canManage && (
              <Button onClick={() => setIsNewClienteModalOpen(true)} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                <Plus className="mr-2 h-4 w-4" /> Novo Cliente
              </Button>
            )}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
            <Input
              className="pl-11 h-12 text-base rounded-xl border-gray-200 shadow-sm"
              placeholder="Buscar por CNPJ, nome da empresa, nome da pessoa ou CPF..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-700 text-white border-0 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Clientes</p>
                    <p className="text-5xl font-bold mt-1">{isLoading ? '—' : matrizes.length}</p>
                    <p className="text-blue-200 text-xs mt-1">empresas cadastradas</p>
                  </div>
                  <Users className="h-14 w-14 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-0 shadow-lg">
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-emerald-100 text-sm font-medium uppercase tracking-wide">Apólices Ativas</p>
                    <p className="text-5xl font-bold mt-1">{isLoading ? '—' : apolicesAtivas}</p>
                    <p className="text-emerald-200 text-xs mt-1">em vigência</p>
                  </div>
                  <FileText className="h-14 w-14 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card
              className={`text-white border-0 shadow-lg transition-all ${totalPendentes > 0 ? 'bg-gradient-to-br from-red-500 to-red-700 cursor-pointer hover:shadow-xl' : 'bg-gradient-to-br from-gray-400 to-gray-600'}`}
              onClick={() => totalPendentes > 0 && navigate('/solicitacoes')}
            >
              <CardContent className="pt-6 pb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-medium uppercase tracking-wide ${totalPendentes > 0 ? 'text-red-100' : 'text-gray-200'}`}>Solicitações</p>
                    <p className="text-5xl font-bold mt-1">{isLoading ? '—' : totalPendentes}</p>
                    <p className={`text-xs mt-1 ${totalPendentes > 0 ? 'text-red-200' : 'text-gray-300'}`}>
                      {totalPendentes > 0 ? 'pendentes — clique para ver' : 'nenhuma pendente'}
                    </p>
                  </div>
                  <AlertTriangle className="h-14 w-14 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Company List */}
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
            ) : searchResults.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Building className="h-14 w-14 mx-auto mb-3 opacity-20" />
                <p className="font-semibold text-lg text-gray-500">Nenhum cliente encontrado</p>
                {searchTerm ? (
                  <p className="text-sm mt-1">
                    Nenhum resultado para <span className="font-medium text-gray-600">"{searchTerm}"</span>.{' '}
                    <button className="text-blue-500 underline" onClick={() => setIsNewClienteModalOpen(true)}>Criar novo cliente?</button>
                  </p>
                ) : (
                  <p className="text-sm mt-1">Clique em "Novo Cliente" para começar.</p>
                )}
              </div>
            ) : (
              searchResults.map(matriz => {
                const pendentes = getTotalPendentesMatriz(matriz.id);
                const filiaisCount = getFiliaisForMatriz(matriz.id).length;
                return (
                  <motion.div
                    key={matriz.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-xl border bg-white shadow-sm hover:shadow-md transition-all overflow-hidden"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="bg-gradient-to-br from-blue-100 to-indigo-100 p-2.5 rounded-xl shrink-0">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{matriz.nome_fantasia || matriz.razao_social}</p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            CNPJ: {applyCnpjMask(matriz.cnpj)}
                            {filiaisCount > 0 && <span className="ml-2 text-gray-400">· {filiaisCount} filial(is)</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        {pendentes > 0 && (
                          <button
                            onClick={() => goToSolicitacoes(matriz.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-50 border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-100 transition-colors"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {pendentes} pendente{pendentes !== 1 ? 's' : ''}
                          </button>
                        )}
                        <Button
                          size="sm"
                          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                          onClick={() => navigate(`/admin/cliente/${matriz.id}`)}
                        >
                          Acessar <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                        {canManage && (
                          <>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openAddFilialModal(matriz)} title="Adicionar filial">
                              <GitBranchPlus className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => openEditModal(matriz)} title="Editar acesso">
                              <Edit className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:border-red-300">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                                  <AlertDialogDescription>Isso excluirá permanentemente o cliente e sua conta de acesso. Só é possível se não houver filiais cadastradas.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => deleteMatriz(matriz.id)} className={buttonVariants({ variant: 'destructive' })}>Excluir</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

        </motion.div>
      </DashboardLayout>

      {/* Modal Novo Cliente */}
      <Dialog open={isNewClienteModalOpen} onOpenChange={setIsNewClienteModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
          <form onSubmit={validateAndSubmitMatriz}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div><Label htmlFor="razao_social">Razão Social *</Label><Input id="razao_social" value={newEmpresa.razao_social} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
              <div><Label htmlFor="nome_fantasia">Nome Fantasia</Label><Input id="nome_fantasia" value={newEmpresa.nome_fantasia} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
              <div><Label htmlFor="cnpj">CNPJ *</Label><Input id="cnpj" value={newEmpresa.cnpj} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
              <div><Label htmlFor="endereco_completo">Endereço</Label><Input id="endereco_completo" value={newEmpresa.endereco_completo} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
              <div className="md:col-span-2 border-t pt-4 mt-1">
                <p className="text-sm font-medium text-gray-600 mb-3">Credenciais de acesso do cliente</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label htmlFor="email_cliente">E-mail *</Label><Input id="email_cliente" type="email" value={newEmpresa.email_cliente} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
                  <div><Label htmlFor="senha_cliente">Senha *</Label><Input id="senha_cliente" type="password" value={newEmpresa.senha_cliente} onChange={e => handleInputChange(e, setNewEmpresa)} /></div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsNewClienteModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar Cliente
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Acesso do Cliente */}
      {editingEmpresa && (
        <Dialog open={isEditEmpresaModalOpen} onOpenChange={setIsEditEmpresaModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Acesso do Cliente</DialogTitle>
              <p className="text-sm text-muted-foreground">{editingEmpresa.nome_fantasia || editingEmpresa.razao_social}</p>
            </DialogHeader>
            <form onSubmit={validateAndSubmitEditMatriz}>
              <div className="space-y-4 py-4">
                <div><Label htmlFor="email_cliente">E-mail *</Label><Input id="email_cliente" type="email" value={editingEmpresa.email_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} /></div>
                <div><Label htmlFor="senha_cliente">Nova Senha (opcional)</Label><Input id="senha_cliente" type="password" placeholder="Deixe em branco para manter a atual" value={editingEmpresa.senha_cliente} onChange={e => handleInputChange(e, setEditingEmpresa)} /></div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditEmpresaModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal Adicionar Filial */}
      {canManage && selectedMatriz && (
        <Dialog open={isAddFilialModalOpen} onOpenChange={setIsAddFilialModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Adicionar Filial</DialogTitle>
              <p className="text-sm text-muted-foreground">{selectedMatriz.nome_fantasia || selectedMatriz.razao_social}</p>
            </DialogHeader>
            <form onSubmit={validateAndSubmitFilial} className="space-y-4 py-2">
              <div><Label>Razão Social *</Label><Input id="razao_social" value={filialFormData.razao_social} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>Nome Fantasia</Label><Input id="nome_fantasia" value={filialFormData.nome_fantasia} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>CNPJ *</Label><Input id="cnpj" value={filialFormData.cnpj} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <div><Label>Endereço</Label><Input id="endereco_completo" value={filialFormData.endereco_completo} onChange={e => handleInputChange(e, setFilialFormData)} /></div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddFilialModalOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <GitBranchPlus className="mr-2 h-4 w-4" /> Adicionar Filial
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AdminDashboard;
