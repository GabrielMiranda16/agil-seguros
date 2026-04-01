import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Plus, Download, Edit2, Trash2, ArrowLeft, Loader2, Search } from 'lucide-react';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Services
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { empresasService } from '@/services/empresasService';
import { cleanCoparticipacaoData, validateCoparticipacao } from '@/lib/coparticipacaoValidator';

const CoparticipacaoPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const { selectedCompanyId } = useCompany();

  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [currentDependents, setCurrentDependents] = useState([]);
  const [selectedDependentId, setSelectedDependentId] = useState('titular');

  const [formData, setFormData] = useState({
    empresa_id: '',
    cnpj: '',
    beneficiario_id: '',
    nome_quem_utilizou: '',
    cpf_quem_utilizou: '',
    valor: '',
    mes: '',
    descricao: ''
  });

  const fetchData = async () => {
      try {
          setIsLoading(true);
          const [copData, benData, empData] = await Promise.all([
              coparticipacaoService.getAllCoparticipacoes(),
              beneficiariosService.getAllBeneficiarios(),
              empresasService.getEmpresas()
          ]);
          setCoparticipacoes(copData);
          setBeneficiarios(benData);
          setEmpresas(empData);
      } catch (error) {
          console.error("Error fetching data", error);
          toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados.' });
      } finally {
          setIsLoading(false);
      }
  };

  useEffect(() => {
      fetchData();
  }, []);

  const getBeneficiarioName = (id) => {
    const ben = beneficiarios.find(b => b.id === id);
    return ben ? ben.nome_completo : 'Desconhecido';
  };

  const coparticipacoesFiltradas = useMemo(() => {
    if (!selectedCompanyId) return [];
    
    // Convert to string for comparison to avoid type mismatch
    const selectedId = String(selectedCompanyId);
    
    // First filter by company
    let filtered = coparticipacoes.filter(c => String(c.empresa_id) === selectedId);
    
    // Then filter by search term if it exists
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(item => {
        const benName = getBeneficiarioName(item.beneficiario_id).toLowerCase();
        const description = (item.descricao || '').toLowerCase();
        const competencia = (item.competencia || '').toLowerCase();
        
        return benName.includes(lowerSearch) || 
               description.includes(lowerSearch) || 
               competencia.includes(lowerSearch);
      });
    }
    
    return filtered;
  }, [coparticipacoes, selectedCompanyId, searchTerm, beneficiarios]);

  const beneficiariosFiltrados = useMemo(() => {
    if (!selectedCompanyId) return [];

    const empresaSelecionada = empresas.find(e => e.id === selectedCompanyId);
    if (!empresaSelecionada) return [];

    let idsDasEmpresas = [];
    if (empresaSelecionada.tipo === 'MATRIZ') {
        const filiais = empresas.filter(e => e.empresa_matriz_id === selectedCompanyId);
        idsDasEmpresas = [selectedCompanyId, ...filiais.map(f => f.id)];
    } else {
        idsDasEmpresas = [selectedCompanyId];
    }
    
    return beneficiarios.filter(b => idsDasEmpresas.includes(b.empresa_id) && !b.data_exclusao);
  }, [beneficiarios, selectedCompanyId, empresas]);

  const handleAddClick = () => {
    if (!selectedCompanyId) {
      toast({ variant: "destructive", title: "Atenção", description: "Selecione uma empresa antes de adicionar um registro." });
      return;
    }

    const empresaSelecionada = empresas.find(e => e.id === selectedCompanyId);
    const cnpjEmpresa = empresaSelecionada?.cnpj || '';
    
    if (!cnpjEmpresa) {
      toast({ variant: "destructive", title: "Erro", description: "Empresa selecionada não possui CNPJ configurado." });
      return;
    }
    
    setEditingId(null);
    setCurrentDependents([]);
    setSelectedDependentId('titular');
    setFormData({
      empresa_id: String(selectedCompanyId),
      cnpj: cnpjEmpresa,
      beneficiario_id: '',
      nome_quem_utilizou: '',
      cpf_quem_utilizou: '',
      valor: '',
      mes: '',
      descricao: ''
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (coparticipacao) => {
    setEditingId(coparticipacao.id);
    
    const beneficiary = beneficiarios.find(b => b.id === coparticipacao.beneficiario_id);
    let dependents = [];
    if (beneficiary) {
        // Find dependents by matching nome_titular to the beneficiary's name
        dependents = beneficiarios.filter(b => 
            b.nome_titular === beneficiary.nome_completo && 
            b.id !== beneficiary.id
        );
    }
    setCurrentDependents(dependents);

    // Determine who utilized based on name matching
    let whoUtilizedId = 'titular';
    if (beneficiary && coparticipacao.nome_quem_utilizou !== beneficiary.nome_completo) {
        const foundDep = dependents.find(d => d.nome_completo === coparticipacao.nome_quem_utilizou);
        if (foundDep) {
            whoUtilizedId = String(foundDep.id);
        }
    }
    setSelectedDependentId(whoUtilizedId);

    setFormData({
      empresa_id: String(coparticipacao.empresa_id),
      cnpj: empresas.find(e => e.id === coparticipacao.empresa_id)?.cnpj || '',
      beneficiario_id: String(coparticipacao.beneficiario_id),
      nome_quem_utilizou: coparticipacao.nome_quem_utilizou || '', 
      cpf_quem_utilizou: coparticipacao.cpf_quem_utilizou || '',
      valor: coparticipacao.valor,
      mes: coparticipacao.competencia,
      descricao: coparticipacao.descricao || ''
    });
    setIsModalOpen(true);
  };

  const handleBeneficiaryChange = (value) => {
    const beneficiaryId = parseInt(value);
    const beneficiary = beneficiarios.find(b => b.id === beneficiaryId);
    
    if (beneficiary) {
      // Find dependents
      const dependents = beneficiarios.filter(b => 
        b.nome_titular === beneficiary.nome_completo && 
        b.id !== beneficiary.id
      );
      
      setCurrentDependents(dependents);
      setSelectedDependentId('titular');

      setFormData(prev => ({
        ...prev,
        beneficiario_id: value,
        nome_quem_utilizou: beneficiary.nome_completo || '',
        cpf_quem_utilizou: beneficiary.cpf || ''
      }));
    } else {
      setCurrentDependents([]);
      setSelectedDependentId('titular');
      setFormData(prev => ({
        ...prev,
        beneficiario_id: value,
        nome_quem_utilizou: '',
        cpf_quem_utilizou: ''
      }));
    }
  };

  const handleDependentChange = (value) => {
    setSelectedDependentId(value);
    
    if (value === 'titular') {
      const beneficiary = beneficiarios.find(b => b.id === parseInt(formData.beneficiario_id));
      if (beneficiary) {
        setFormData(prev => ({
          ...prev,
          nome_quem_utilizou: beneficiary.nome_completo,
          cpf_quem_utilizou: beneficiary.cpf
        }));
      }
    } else {
      const dependent = currentDependents.find(d => d.id === parseInt(value));
      if (dependent) {
        setFormData(prev => ({
          ...prev,
          nome_quem_utilizou: dependent.nome_completo,
          cpf_quem_utilizou: dependent.cpf
        }));
      }
    }
  };

  const handleSave = async () => {
    const rawData = {
      empresa_id: formData.empresa_id,
      beneficiario_id: formData.beneficiario_id,
      competencia: formData.mes,
      valor: formData.valor,
      descricao: formData.descricao,
      nome_quem_utilizou: formData.nome_quem_utilizou,
      cpf_quem_utilizou: formData.cpf_quem_utilizou,
      data_registro: new Date().toISOString()
    };

    const cleanedData = cleanCoparticipacaoData(rawData);
    const errors = validateCoparticipacao(cleanedData);

    if (errors.length > 0) {
      toast({ variant: "destructive", title: "Erro de Validação", description: errors[0] });
      return;
    }

    setIsSubmitting(true);

    try {
        if (editingId) {
            await coparticipacaoService.updateCoparticipacao(editingId, cleanedData);
            setCoparticipacoes(prev => prev.map(item => item.id === editingId ? { ...item, ...cleanedData } : item));
            toast({ title: "Sucesso", description: "Registro atualizado com sucesso." });
        } else {
            const created = await coparticipacaoService.createCoparticipacao(cleanedData);
            setCoparticipacoes(prev => [...prev, created]);
            toast({ title: "Sucesso", description: "Coparticipação registrada com sucesso." });
        }
        setIsModalOpen(false);
    } catch (error) {
        console.error("Save error:", error);
        toast({ variant: "destructive", title: "Erro", description: "Falha ao salvar registro." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      try {
          await coparticipacaoService.deleteCoparticipacao(id);
          setCoparticipacoes(prev => prev.filter(item => item.id !== id));
          toast({ title: "Excluído", description: "Registro removido com sucesso." });
      } catch (error) {
          toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir registro." });
      }
    }
  };

  const handleExportPDF = () => {
    if (coparticipacoesFiltradas.length === 0) {
      toast({ variant: "warning", description: "Não há dados para exportar." });
      return;
    }
    
    const doc = new jsPDF();
    
    const tableColumn = ["Mês", "Beneficiário", "CNPJ", "Quem Utilizou", "CPF Utilizador", "Valor (R$)", "Descrição"];
    const tableRows = [];

    coparticipacoesFiltradas.forEach(item => {
      const emp = empresas.find(e => e.id === item.empresa_id);
      const rowData = [
        item.competencia,
        getBeneficiarioName(item.beneficiario_id),
        emp?.cnpj || '-',
        item.nome_quem_utilizou || '-',
        item.cpf_quem_utilizou || '-',
        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor),
        item.descricao || '-'
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
    });
    
    doc.text("Relatório de Coparticipação", 14, 15);
    doc.save(`coparticipacao_${selectedCompanyId}_${new Date().toISOString().split('T')[0]}.pdf`);
    
    toast({ description: "Exportação PDF concluída!" });
  };

  const handleExportExcel = () => {
     if (coparticipacoesFiltradas.length === 0) {
      toast({ variant: "warning", description: "Não há dados para exportar." });
      return;
    }

    const data = coparticipacoesFiltradas.map(item => {
      const emp = empresas.find(e => e.id === item.empresa_id);
      return {
        "Mês": item.competencia,
        "Beneficiário": getBeneficiarioName(item.beneficiario_id),
        "CNPJ": emp?.cnpj || '-',
        "Quem Utilizou": item.nome_quem_utilizou || '-',
        "CPF Utilizador": item.cpf_quem_utilizou || '-',
        "Valor": item.valor,
        "Descrição": item.descricao || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Coparticipacao");
    XLSX.writeFile(workbook, `coparticipacao_${selectedCompanyId}_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({ description: "Exportação Excel concluída!" });
  };

  return (
    <DashboardLayout>
      <Helmet>
        <title>Coparticipação - Gestão</title>
      </Helmet>

      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coparticipação</h1>
            <p className="text-muted-foreground">Gerencie os valores de coparticipação mensal por empresa.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            <Button variant="outline" onClick={handleExportPDF}>
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
            <Button variant="outline" onClick={handleExportExcel}>
              <Download className="mr-2 h-4 w-4" /> Exportar Excel
            </Button>
            <Button onClick={handleAddClick} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={!selectedCompanyId}>
              <Plus className="mr-2 h-4 w-4" /> Registrar Coparticipação
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Histórico de Lançamentos</CardTitle>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  type="search"
                  placeholder="Buscar lançamentos..."
                  className="pl-9"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? <div className="text-center py-8 flex flex-col items-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-2"/>Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Mês</th>
                    <th className="px-4 py-3">Beneficiário</th>
                    <th className="px-4 py-3">CNPJ Vinculado</th>
                    <th className="px-4 py-3">Quem Utilizou</th>
                    <th className="px-4 py-3">CPF Utilizador</th>
                    <th className="px-4 py-3">Descrição</th>
                    <th className="px-4 py-3">Valor (R$)</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {coparticipacoesFiltradas.length > 0 ? (
                    coparticipacoesFiltradas.map((item) => {
                      const emp = empresas.find(e => e.id === item.empresa_id);
                      return (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium">{item.competencia}</td>
                        <td className="px-4 py-3">{getBeneficiarioName(item.beneficiario_id)}</td>
                        <td className="px-4 py-3 text-xs text-gray-500">{emp?.cnpj || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.nome_quem_utilizou || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.cpf_quem_utilizou || '-'}</td>
                        <td className="px-4 py-3 text-gray-600">{item.descricao || '-'}</td>
                        <td className="px-4 py-3 text-green-600 font-bold">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)}>
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )})
                  ) : (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                        {selectedCompanyId ? 'Nenhum registro encontrado.' : 'Selecione uma empresa no dashboard para visualizar os registros.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Coparticipação' : 'Registrar Coparticipação'}</DialogTitle>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                 <Label htmlFor="cnpj_vinculado">CNPJ (Vinculado)</Label>
                 <Input 
                   id="cnpj_vinculado" 
                   value={formData.cnpj || ''} 
                   readOnly
                   disabled
                   className="bg-gray-100 text-gray-600"
                 />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="beneficiario">Beneficiário (Titular) *</Label>
                <Select 
                  value={String(formData.beneficiario_id)} 
                  onValueChange={handleBeneficiaryChange}
                >
                  <SelectTrigger id="beneficiario">
                    <SelectValue placeholder="Selecione o beneficiário titular..." />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiariosFiltrados.length > 0 ? (
                      beneficiariosFiltrados.map((ben) => (
                        <SelectItem key={ben.id} value={String(ben.id)}>
                          {ben.nome_completo}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-2 text-sm text-center text-muted-foreground">
                        Nenhum beneficiário encontrado nesta empresa.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quem_utilizou">Quem Utilizou</Label>
                  <Select 
                    value={selectedDependentId} 
                    onValueChange={handleDependentChange}
                    disabled={!formData.beneficiario_id}
                  >
                    <SelectTrigger id="quem_utilizou">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="titular">Titular</SelectItem>
                      {currentDependents.map((dep) => (
                        <SelectItem key={dep.id} value={String(dep.id)}>
                          Dep: {dep.nome_completo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="cpf_quem_utilizou">CPF de Quem Utilizou</Label>
                  <Input 
                    id="cpf_quem_utilizou" 
                    value={formData.cpf_quem_utilizou} 
                    readOnly
                    className="bg-gray-50"
                    placeholder="CPF será preenchido automaticamente"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="valor">Valor (R$) *</Label>
                  <Input 
                    id="valor" 
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.valor} 
                    onChange={(e) => setFormData({...formData, valor: e.target.value})}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="mes">Competência (Mês/Ano) *</Label>
                  <Input 
                    id="mes" 
                    type="month"
                    value={formData.mes} 
                    onChange={(e) => setFormData({...formData, mes: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="descricao">Descrição (Opcional)</Label>
                <Input 
                  id="descricao" 
                  value={formData.descricao} 
                  onChange={(e) => setFormData({...formData, descricao: e.target.value})}
                  placeholder="Ex: Consulta dermatologista"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default CoparticipacaoPage;