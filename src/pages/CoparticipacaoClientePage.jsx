import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, FileText, ArrowLeft, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Services
import { coparticipacaoService } from '@/services/coparticipacaoService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { empresasService } from '@/services/empresasService';

const CoparticipacaoClientePage = () => {
  const navigate = useNavigate();
  const { empresaId } = useParams();
  const { setSelectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [coparticipacoes, setCoparticipacoes] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [copData, benData, empData] = await Promise.all([
          coparticipacaoService.getAllCoparticipacoes(),
          beneficiariosService.getAllBeneficiarios(),
          empresasService.getEmpresas()
        ]);
        setCoparticipacoes(copData);
        setBeneficiarios(benData);
        setEmpresas(empData);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast({ 
          variant: "destructive", 
          title: "Erro", 
          description: "Falha ao carregar dados de coparticipação." 
        });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  useEffect(() => {
    if (empresaId) {
      setSelectedCompanyId(parseInt(empresaId));
    }
  }, [empresaId, setSelectedCompanyId]);

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsArray = [];
    for (let i = 0; i < 6; i++) {
      yearsArray.push(currentYear - i);
    }
    return yearsArray;
  }, []);

  const filteredCoparticipacoes = useMemo(() => {
    if (!empresaId) {
        return [];
    }

    // Format YYYY-MM
    const monthPadded = String(selectedMonth).padStart(2, '0');
    const selectedPeriod = `${selectedYear}-${monthPadded}`;

    // Filter directly by empresa_id and competence period
    return coparticipacoes.filter(c => 
      String(c.empresa_id) === String(empresaId) && 
      c.competencia === selectedPeriod
    );
  }, [coparticipacoes, empresaId, selectedMonth, selectedYear]);

  const totalMes = useMemo(() => {
    return filteredCoparticipacoes.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
  }, [filteredCoparticipacoes]);

  const getBeneficiarioName = (id) => {
    const ben = beneficiarios.find(b => b.id === id);
    return ben ? ben.nome_completo : 'Desconhecido';
  };

  const getMonthName = (monthValue) => {
    const month = months.find(m => m.value === monthValue);
    return month ? month.label : '';
  };

  const handleExportPDF = () => {
    if (filteredCoparticipacoes.length === 0) {
      toast({ variant: "destructive", description: "Não há dados para exportar." });
      return;
    }

    const doc = new jsPDF();
    const empresaAtual = empresas.find(e => e.id === parseInt(empresaId));
    const mesLabel = getMonthName(selectedMonth);

    doc.setFontSize(18);
    doc.text("Relatório de Coparticipação", 14, 22);

    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Empresa: ${empresaAtual?.nome_fantasia || empresaAtual?.razao_social}`, 14, 30);
    doc.text(`CNPJ: ${empresaAtual?.cnpj}`, 14, 36);
    doc.text(`Mês de Referência: ${mesLabel} de ${selectedYear}`, 14, 42);

    const tableColumn = ["Beneficiário Titular", "Quem Utilizou", "CPF Utilizador", "Descrição", "Valor (R$)"];
    const tableRows = [];

    filteredCoparticipacoes.forEach(item => {
      const itemData = [
        getBeneficiarioName(item.beneficiario_id),
        item.nome_quem_utilizou || '-', // Modified
        item.cpf_quem_utilizou || '-', // Modified
        item.descricao || '-',
        new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(item.valor)
      ];
      tableRows.push(itemData);
    });

    const totalRow = [
      { content: 'TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
      { content: new Intl.NumberFormat('pt-BR', { style: 'decimal', minimumFractionDigits: 2 }).format(totalMes), styles: { halign: 'right', fontStyle: 'bold' } }
    ];
    tableRows.push(totalRow);

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 50,
      theme: 'striped',
      headStyles: { fillColor: [22, 160, 133] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' }
    });

    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, 14, doc.internal.pageSize.height - 10);
    }

    const monthPadded = String(selectedMonth).padStart(2, '0');
    doc.save(`coparticipacao_${empresaAtual?.cnpj}_${selectedYear}-${monthPadded}.pdf`);
  };

  const handleExportExcel = () => {
    if (filteredCoparticipacoes.length === 0) {
      toast({ variant: "destructive", description: "Não há dados para exportar." });
      return;
    }

    const empresaAtual = empresas.find(e => e.id === parseInt(empresaId));

    const dataToExport = filteredCoparticipacoes.map(item => ({
      "Beneficiário Titular": getBeneficiarioName(item.beneficiario_id),
      "Quem Utilizou": item.nome_quem_utilizou || '-', // Modified
      "CPF Utilizador": item.cpf_quem_utilizou || '-', // Modified
      "Descrição / Procedimento": item.descricao || '-',
      "Valor (R$)": item.valor
    }));

    dataToExport.push({
      "Beneficiário Titular": "",
      "Quem Utilizou": "",
      "CPF Utilizador": "",
      "Descrição / Procedimento": "TOTAL",
      "Valor (R$)": totalMes
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Coparticipação");

    const colsWidth = [{ wch: 30 }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 15 }];
    worksheet["!cols"] = colsWidth;

    const monthPadded = String(selectedMonth).padStart(2, '0');
    XLSX.writeFile(workbook, `coparticipacao_${empresaAtual?.cnpj}_${selectedYear}-${monthPadded}.xlsx`);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-200px)]">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Helmet>
        <title>Minha Coparticipação - Portal do Cliente</title>
      </Helmet>

      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Minha Coparticipação</h1>
            <p className="text-muted-foreground">Visualize os lançamentos mensais de coparticipação vinculados ao seu CNPJ.</p>
          </div>
          <div className="flex gap-2">
             <Button variant="outline" onClick={() => navigate(-1)}>
               <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
             </Button>
          </div>
        </div>

        {/* Filter & Summary */}
        <div className="grid gap-6 md:grid-cols-3">
            <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                    <CardTitle className="text-base font-medium">Filtrar por Período</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-2">
                            <Label>Mês</Label>
                            <Select value={String(selectedMonth)} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione um mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    {months.map(m => (
                                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex-1 space-y-2">
                            <Label>Ano</Label>
                            <Select value={String(selectedYear)} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder="Selecione um ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {years.map(y => (
                                        <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="md:col-span-2 bg-gradient-to-r from-blue-600 to-blue-800 text-white border-none shadow-md">
                <CardHeader className="pb-2">
                    <CardTitle className="text-white flex items-center gap-2">
                        <FileText className="h-5 w-5" /> Resumo do Período
                    </CardTitle>
                    <CardDescription className="text-blue-100">
                        Total de coparticipações lançadas em {getMonthName(selectedMonth)} de {selectedYear}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-end justify-between">
                        <div>
                            <p className="text-4xl font-bold">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMes)}
                            </p>
                            <p className="text-sm text-blue-100 mt-1">
                                {filteredCoparticipacoes.length} {filteredCoparticipacoes.length === 1 ? 'lançamento' : 'lançamentos'}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between"> 
            <CardTitle>Detalhamento</CardTitle> 
            <div className="flex gap-2"> 
              <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={filteredCoparticipacoes.length === 0}> 
                <Download className="mr-2 h-4 w-4" /> Baixar Excel (.xlsx) 
              </Button> 
              <Button variant="outline" size="sm" onClick={handleExportPDF} disabled={filteredCoparticipacoes.length === 0}> 
                <Download className="mr-2 h-4 w-4" /> Baixar PDF 
              </Button> 
            </div> 
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-700 uppercase font-medium">
                  <tr>
                    <th className="px-4 py-3">Beneficiário Titular</th>
                    <th className="px-4 py-3">Quem Utilizou</th>
                    <th className="px-4 py-3">CPF Utilizador</th>
                    <th className="px-4 py-3">Descrição / Procedimento</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredCoparticipacoes.length > 0 ? (
                    filteredCoparticipacoes.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900">
                             {getBeneficiarioName(item.beneficiario_id)}
                        </td>
                        <td className="px-4 py-3 text-gray-600">{item.nome_quem_utilizou || '-'}</td> {/* Modified */}
                        <td className="px-4 py-3 text-gray-500">{item.cpf_quem_utilizou || '-'}</td> {/* Modified */}
                        <td className="px-4 py-3 text-gray-600">{item.descricao || '-'}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.valor)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                            <Calendar className="h-10 w-10 mb-2 opacity-20" />
                            <p>Nenhuma coparticipação encontrada para este período e CNPJ.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
                {filteredCoparticipacoes.length > 0 && (
                    <tfoot className="bg-gray-50 font-bold border-t">
                        <tr>
                            <td colSpan={4} className="px-4 py-3 text-right text-gray-600">TOTAL:</td>
                            <td className="px-4 py-3 text-right text-blue-700 text-base">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalMes)}
                            </td>
                        </tr>
                    </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CoparticipacaoClientePage;