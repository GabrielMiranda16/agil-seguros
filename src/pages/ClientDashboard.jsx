import React, { useState, useMemo, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useParams, Navigate } from 'react-router-dom';
import { useCompany } from '@/contexts/CompanyContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import DashboardLayout from '@/components/DashboardLayout';
import MetricCard from '@/components/MetricCard';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, UserCheck, UserX, UserMinus, Plus, Edit, Trash2, Search, Loader2, Info, Heart, Smile, Hotel as Hospital, ExternalLink, CheckCircle2, Calendar, Timer, RotateCcw, AlertCircle, X, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCpfMask, applyPhoneMask, applyCepMask } from '@/lib/masks';
import { calculateAge, formatCurrency, formatDate } from '@/lib/utils';
import { differenceInMinutes } from 'date-fns';

// Services
import { empresasService } from '@/services/empresasService';
import { beneficiariosService } from '@/services/beneficiariosService';
import { solicitacoesService } from '@/services/solicitacoesService';

const emptyBeneficiario = {
  nome_completo: '', cpf: '', parentesco: '', data_nascimento: '', nome_mae: '', nome_titular: '', celular: '', email_beneficiario: '', 
  cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  matricula_empresa: '', data_admissao: '', observacoes: '', situacao: 'ATIVO', data_inatividade: '', data_afastamento: '', motivo_afastamento: '',
  saude_ativo: false, saude_plano_nome: '', saude_acomodacao: '', saude_data_inclusao: '', saude_data_exclusao: '', saude_numero_carteirinha: '', saude_link_carteirinha: '', saude_valor_fatura: 0, saude_coparticipacao: 'Não', saude_codigo_empresa: '', saude_produto: '',
  vida_ativo: false, vida_plano_nome: '', vida_data_inclusao: '', vida_data_exclusao: '', vida_numero_carteirinha: '', vida_link_carteirinha: '', vida_valor_fatura: 0, vida_codigo_empresa: '', vida_produto: '',
  odonto_ativo: false, odonto_plano_nome: '', odonto_data_inclusao: '', odonto_data_exclusao: '', odonto_numero_carteirinha: '', odonto_link_carteirinha: '', odonto_valor_fatura: 0, odonto_codigo_empresa: '', odonto_produto: '',
};

const FormField = ({ id, label, children, tooltip }) => (
  <div className="space-y-2"><div className="flex items-center space-x-2"><Label htmlFor={id}>{label}</Label>{tooltip && (<TooltipProvider delayDuration={100}><Tooltip><TooltipTrigger type="button"><Info className="h-4 w-4 text-gray-500" /></TooltipTrigger><TooltipContent><p>{tooltip}</p></TooltipContent></Tooltip></TooltipProvider>)}</div>{children}</div>
);

const verificarPlanoPreenchido = (tipoPlano, formData) => {
  const camposPlano = Object.keys(formData).filter(key => key.startsWith(`${tipoPlano}_`) && key !== `${tipoPlano}_ativo`);
  for (const campo of camposPlano) {
    const valor = formData[campo];
    if (valor !== '' && valor !== 0 && valor !== '0' && valor !== null && valor !== undefined) {
      return true;
    }
  }
  return false;
};

const getTempoDecorrido = (dataStr) => {
    if (!dataStr) return '-';
    const start = new Date(dataStr);
    const end = new Date();
    const diffMins = differenceInMinutes(end, start);
    const days = Math.floor(diffMins / (24 * 60));
    const hours = Math.floor((diffMins % (24 * 60)) / 60);
    return `${days}d ${hours}h`;
};

const getStatusColor = (status) => {
  switch (status) {
    case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100 border-yellow-200';
    case 'EM PROCESSAMENTO': return 'bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200';
    case 'CONCLUIDA': return 'bg-green-100 text-green-800 hover:bg-green-100 border-green-200';
    case 'REJEITADA': return 'bg-red-100 text-red-800 hover:bg-red-100 border-red-200';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const PlanCheckboxIcon = ({ label, checked }) => (
  <div className="flex items-center gap-2 cursor-default pointer-events-none" onClick={(e) => e.stopPropagation()}>
    <div className="flex items-center justify-center h-5 w-5">
       {checked ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <div className="h-5 w-5" />}
    </div>
    <span className="text-sm font-medium leading-none">{label}</span>
  </div>
);

const ModalFormContent = React.memo(({ formData, setFormData, age, titulares, isCliente, openSolicitacaoDialog, renderPlanStatusCard, setIsExclusaoModalOpen, setExclusaoData, beneficiario, handleSolicitarAlteracao }) => {
  const { toast } = useToast();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    let finalValue = value;
    if (id === 'cpf') finalValue = applyCpfMask(value);
    if (id === 'celular') finalValue = applyPhoneMask(value);
    if (id === 'cep') finalValue = applyCepMask(value);
    
    setFormData(prev => {
      const newFormData = { ...prev, [id]: finalValue };
      if (id.startsWith('saude_') && id !== 'saude_ativo') {
        newFormData.saude_ativo = verificarPlanoPreenchido('saude', newFormData);
      } else if (id.startsWith('vida_') && id !== 'vida_ativo') {
        newFormData.vida_ativo = verificarPlanoPreenchido('vida', newFormData);
      } else if (id.startsWith('odonto_') && id !== 'odonto_ativo') {
        newFormData.odonto_ativo = verificarPlanoPreenchido('odonto', newFormData);
      }
      return newFormData;
    });
  };

  const handleCepBlur = async (e) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) { return; }
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      if (!response.ok) throw new Error('CEP não encontrado');
      const data = await response.json();
      if (data.erro) {
        toast({ variant: 'destructive', title: 'CEP não encontrado', description: 'Por favor, verifique o CEP digitado.' });
        return;
      }
      setFormData(prev => ({ ...prev, rua: data.logradouro, bairro: data.bairro, cidade: data.localidade, estado: data.uf, }));
      toast({ title: 'Endereço preenchido!', description: 'Os dados de endereço foram carregados.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP', description: 'Não foi possível buscar o endereço. Tente novamente.' });
    }
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => {
      const newState = { ...prev, [id]: value };
      if (id === 'situacao') {
          if (value !== 'AFASTADO') {
            newState.data_afastamento = '';
            newState.motivo_afastamento = '';
          }
          if (value !== 'INATIVO') {
            newState.data_inatividade = '';
          }
      }
      if (id === 'parentesco') {
        if (value === 'TITULAR') {
          newState.nome_titular = '';
        }
      }
      return newState;
    });
  };

  const totalGeralBeneficiario = useMemo(() => {
    return (Number(formData.saude_valor_fatura) || 0) + (Number(formData.vida_valor_fatura) || 0) + (Number(formData.odonto_valor_fatura) || 0);
  }, [formData]);

  return (
    <div className="flex-1 overflow-y-auto max-h-[calc(90vh-150px)] px-4 py-4">
      <Accordion type="multiple" defaultValue={['personal', 'work', 'contact', 'values']} className="w-full">
        <AccordionItem value="personal"><AccordionTrigger>Dados Pessoais</AccordionTrigger><AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="nome_completo" label="Nome Completo *"><Input id="nome_completo" value={formData.nome_completo} onChange={handleInputChange} /></FormField>
          <FormField id="cpf" label="CPF *"><Input id="cpf" value={formData.cpf} onChange={handleInputChange} /></FormField>
          <FormField id="parentesco" label="Parentesco *"><Select value={formData.parentesco} onValueChange={(v) => handleSelectChange('parentesco', v)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="TITULAR">TITULAR</SelectItem><SelectItem value="CONJUGE">CÔNJUGE</SelectItem><SelectItem value="FILHO(A)">FILHO(A)</SelectItem></SelectContent></Select></FormField>
          <FormField id="data_nascimento" label="Data de Nascimento"><Input id="data_nascimento" type="date" value={formData.data_nascimento} onChange={handleInputChange} /></FormField>
          <FormField id="idade" label="Idade"><Input id="idade" value={age} disabled className="bg-gray-200" /></FormField>
          <FormField id="nome_mae" label="Nome da Mãe"><Input id="nome_mae" value={formData.nome_mae} onChange={handleInputChange} /></FormField>
          
          <FormField id="nome_titular" label="Nome do Titular" tooltip="Selecione o titular para este dependente">
            {formData.parentesco === 'TITULAR' ? (
                <Input id="nome_titular" value={formData.nome_titular} disabled placeholder="Não aplicável para titulares" />
            ) : (
                <Select value={formData.nome_titular} onValueChange={(v) => handleSelectChange('nome_titular', v)} disabled={titulares.length === 0}>
                    <SelectTrigger>
                        <SelectValue placeholder={titulares.length > 0 ? "Selecione o titular..." : "Nenhum titular cadastrado"} />
                    </SelectTrigger>
                    <SelectContent>
                        {titulares.map(titular => (
                            <SelectItem key={titular.id} value={titular.nome_completo}>
                                {titular.nome_completo}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
          </FormField>
          
          <FormField id="situacao" label="Situação Geral *"><Select value={formData.situacao} onValueChange={(v) => handleSelectChange('situacao', v)}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="ATIVO">ATIVO</SelectItem><SelectItem value="INATIVO">INATIVO</SelectItem><SelectItem value="AFASTADO">AFASTADO</SelectItem></SelectContent></Select></FormField>
          {formData.situacao === 'INATIVO' && (
            <FormField id="data_inatividade" label="Data de Inatividade *">
              <Input id="data_inatividade" type="date" value={formData.data_inatividade} onChange={handleInputChange} />
            </FormField>
          )}
          {formData.situacao === 'AFASTADO' && (
            <>
              <FormField id="data_afastamento" label="Data de Afastamento *"><Input id="data_afastamento" type="date" value={formData.data_afastamento} onChange={handleInputChange} /></FormField>
              <FormField id="motivo_afastamento" label="Motivo do Afastamento *"><Input id="motivo_afastamento" value={formData.motivo_afastamento} onChange={handleInputChange} /></FormField>
            </>
          )}
        </AccordionContent></AccordionItem>

        <AccordionItem value="work"><AccordionTrigger>Dados Trabalhistas</AccordionTrigger><AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="matricula_empresa" label="Matrícula e Dígito"><Input id="matricula_empresa" value={formData.matricula_empresa} onChange={handleInputChange} /></FormField>
          <FormField id="data_admissao" label="Data de Admissão"><Input id="data_admissao" type="date" value={formData.data_admissao} onChange={handleInputChange} /></FormField>
        </AccordionContent></AccordionItem>

        <AccordionItem value="contact"><AccordionTrigger>Contato e Endereço</AccordionTrigger><AccordionContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="celular" label="Celular"><Input id="celular" value={formData.celular} onChange={handleInputChange} /></FormField>
            <FormField id="email_beneficiario" label="E-mail"><Input id="email_beneficiario" type="email" value={formData.email_beneficiario} onChange={handleInputChange} /></FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <FormField id="cep" label="CEP"><Input id="cep" value={formData.cep} onChange={handleInputChange} onBlur={handleCepBlur} /></FormField>
            <div className="md:col-span-2"><FormField id="rua" label="Rua"><Input id="rua" value={formData.rua} onChange={handleInputChange} /></FormField></div>
            <FormField id="numero" label="Número"><Input id="numero" value={formData.numero} onChange={handleInputChange} /></FormField>
            <FormField id="complemento" label="Complemento"><Input id="complemento" value={formData.complemento} onChange={handleInputChange} /></FormField>
            <FormField id="bairro" label="Bairro"><Input id="bairro" value={formData.bairro} onChange={handleInputChange} /></FormField>
            <FormField id="cidade" label="Cidade"><Input id="cidade" value={formData.cidade} onChange={handleInputChange} /></FormField>
            <FormField id="estado" label="Estado"><Input id="estado" value={formData.estado} onChange={handleInputChange} /></FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="health_plan"><AccordionTrigger className="text-green-600"><PlanCheckboxIcon label="Plano de Saúde" checked={formData.saude_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="saude_plano_nome" label="Nome do Plano"><Input id="saude_plano_nome" value={formData.saude_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_acomodacao" label="Acomodação"><Input id="saude_acomodacao" value={formData.saude_acomodacao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_codigo_empresa" label="Código da Empresa"><Input id="saude_codigo_empresa" value={formData.saude_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_produto" label="Produto"><Input id="saude_produto" value={formData.saude_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_data_inclusao" label="Data Inclusão"><Input id="saude_data_inclusao" type="date" value={formData.saude_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_data_exclusao" label="Data Exclusão"><Input id="saude_data_exclusao" type="date" value={formData.saude_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_numero_carteirinha" label="Número Carteirinha"><Input id="saude_numero_carteirinha" value={formData.saude_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.saude_link_carteirinha && /^https?:\/\//i.test(formData.saude_link_carteirinha) ? (
                <a href={formData.saude_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="saude_link_carteirinha" type="url" value={formData.saude_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 mt-4">
            <FormField id="saude_valor_fatura" label="Valor Fatura"><Input id="saude_valor_fatura" type="number" step="0.01" value={formData.saude_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="saude_coparticipacao" label="Coparticipação"><Select value={formData.saude_coparticipacao} onValueChange={(v) => handleSelectChange('saude_coparticipacao', v)} disabled={isCliente}><SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger><SelectContent><SelectItem value="Sim">Sim</SelectItem><SelectItem value="Não">Não</SelectItem></SelectContent></Select></FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="life_plan"><AccordionTrigger className="text-blue-600"><PlanCheckboxIcon label="Seguro de Vida" checked={formData.vida_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="vida_plano_nome" label="Nome do Plano"><Input id="vida_plano_nome" value={formData.vida_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_valor_fatura" label="Valor Fatura"><Input id="vida_valor_fatura" type="number" step="0.01" value={formData.vida_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_codigo_empresa" label="Código da Empresa"><Input id="vida_codigo_empresa" value={formData.vida_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_produto" label="Produto"><Input id="vida_produto" value={formData.vida_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_data_inclusao" label="Data Inclusão"><Input id="vida_data_inclusao" type="date" value={formData.vida_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_data_exclusao" label="Data Exclusão"><Input id="vida_data_exclusao" type="date" value={formData.vida_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_numero_carteirinha" label="Número Carteirinha"><Input id="vida_numero_carteirinha" value={formData.vida_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="vida_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.vida_link_carteirinha && /^https?:\/\//i.test(formData.vida_link_carteirinha) ? (
                <a href={formData.vida_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="vida_link_carteirinha" type="url" value={formData.vida_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="dental_plan"><AccordionTrigger className="text-orange-600"><PlanCheckboxIcon label="Plano Odonto" checked={formData.odonto_ativo} /></AccordionTrigger><AccordionContent className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField id="odonto_plano_nome" label="Nome do Plano"><Input id="odonto_plano_nome" value={formData.odonto_plano_nome} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_valor_fatura" label="Valor Fatura"><Input id="odonto_valor_fatura" type="number" step="0.01" value={formData.odonto_valor_fatura} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_codigo_empresa" label="Código da Empresa"><Input id="odonto_codigo_empresa" value={formData.odonto_codigo_empresa} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_produto" label="Produto"><Input id="odonto_produto" value={formData.odonto_produto} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_data_inclusao" label="Data Inclusão"><Input id="odonto_data_inclusao" type="date" value={formData.odonto_data_inclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_data_exclusao" label="Data Exclusão"><Input id="odonto_data_exclusao" type="date" value={formData.odonto_data_exclusao} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_numero_carteirinha" label="Número Carteirinha"><Input id="odonto_numero_carteirinha" value={formData.odonto_numero_carteirinha} onChange={handleInputChange} disabled={isCliente} /></FormField>
            <FormField id="odonto_link_carteirinha" label="Link Carteirinha">
              {isCliente && formData.odonto_link_carteirinha && /^https?:\/\//i.test(formData.odonto_link_carteirinha) ? (
                <a href={formData.odonto_link_carteirinha} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: 'link', className: 'p-0 h-auto' })} >Acessar Carteirinha <ExternalLink className="ml-2 h-4 w-4" /></a>
              ) : ( <Input id="odonto_link_carteirinha" type="url" value={formData.odonto_link_carteirinha} onChange={handleInputChange} disabled={isCliente} /> )}
            </FormField>
          </div>
        </AccordionContent></AccordionItem>

        <AccordionItem value="values"><AccordionTrigger>Valores e Ajustes</AccordionTrigger><AccordionContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField id="total_geral" label="Total Geral"><Input value={formatCurrency(totalGeralBeneficiario)} disabled className="bg-gray-200 font-bold" /></FormField>
        </AccordionContent></AccordionItem>

        <AccordionItem value="obs"><AccordionTrigger>Observações</AccordionTrigger><AccordionContent>
          <FormField id="observacoes" label="Observações"><Textarea id="observacoes" value={formData.observacoes} onChange={handleInputChange} className="h-24" /></FormField>
        </AccordionContent></AccordionItem>
      </Accordion>
      
      {beneficiario && isCliente && (
      <div className="mt-6 pt-6 border-t">
        <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Solicitar Inclusão em Planos</h4>
            <Button type="button" onClick={openSolicitacaoDialog} className="bg-[#003580] hover:bg-[#002060] text-white shadow-md hover:shadow-lg transition-all">
               <Plus className="mr-2 h-4 w-4" /> Solicitar Plano
            </Button>
        </div>

        {/* Status Cards Area */}
        <div className="space-y-2">
            {renderPlanStatusCard('saude', 'Plano de Saúde', Hospital, 'text-green-600')}
            {renderPlanStatusCard('vida', 'Seguro de Vida', Heart, 'text-blue-600')}
            {renderPlanStatusCard('odonto', 'Plano Odonto', Smile, 'text-orange-600')}
        </div>
      </div>
    )}
    </div>
  );
});

ModalFormContent.displayName = 'ModalFormContent';

const ClientDashboard = () => {
  // 1. All Hooks Declaration
  const { empresaId: paramEmpresaId } = useParams();
  const { setSelectedCompanyId } = useCompany();
  const { user } = useAuth();
  const { toast } = useToast();
  const empresaId = Number(paramEmpresaId);
  const empresaId_num = empresaId;

  // State Hooks
  const [empresas, setEmpresas] = useState([]);
  const [beneficiarios, setBeneficiarios] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBeneficiario, setEditingBeneficiario] = useState(null);
  const [formData, setFormData] = useState(emptyBeneficiario);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('Todos');
  const [age, setAge] = useState('');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [isExclusaoModalOpen, setIsExclusaoModalOpen] = useState(false);
  const [exclusaoData, setExclusaoData] = useState({ beneficiarioId: null, tipoPlano: null, motivo: '', dataExclusao: '' });
  
  const [isAlteracaoModalOpen, setIsAlteracaoModalOpen] = useState(false);
  const [alteracaoData, setAlteracaoData] = useState({ beneficiarioId: null, tipoPlano: null });

  const [isSolicitacaoDialogOpen, setIsSolicitacaoDialogOpen] = useState(false);
  const [selectedPlans, setSelectedPlans] = useState([]);

  const [showInclusaoAlert, setShowInclusaoAlert] = useState(true);
  const [showExclusaoAlert, setShowExclusaoAlert] = useState(true);

  // Effects and Memos
  useEffect(() => {
    if (empresaId) {
      setSelectedCompanyId(empresaId);
    }
  }, [empresaId, setSelectedCompanyId]);

  const fetchData = async () => {
     try {
       setIsLoading(true);
       const empresaId_num = Number(empresaId);

       // Debug logs
       console.log("Iniciando fetchData para empresaId:", empresaId_num);

       // Validação de empresaId_num
       if (!empresaId_num || isNaN(empresaId_num)) {
          console.warn("empresaId inválido. Abortando fetchData.");
          setIsLoading(false);
          return;
       }

       const [empresasData, beneficiariosData, solicitacoesData] = await Promise.all([
           empresasService.getEmpresas(),
           beneficiariosService.getAllBeneficiarios(),
           solicitacoesService.getAllSolicitacoes()
       ]);
       
       console.log("Dados carregados com sucesso:", {
           empresas: empresasData?.length,
           beneficiarios: beneficiariosData?.length,
           solicitacoes: solicitacoesData?.length
       });

       setEmpresas(empresasData || []);
       setBeneficiarios(beneficiariosData || []);
       setSolicitacoes(solicitacoesData || []);
     } catch (error) {
       console.error("Error fetching client data:", error);
       toast({ variant: 'destructive', title: 'Erro', description: 'Erro ao carregar dados.' });
     } finally {
       setIsLoading(false);
     }
  };
  
  useEffect(() => { if (empresaId_num) { fetchData(); } }, [empresaId_num]);

  const beneficiariosDaEmpresa = useMemo(() => {
    if (!empresaId) return [];
    return beneficiarios.filter(b => b.empresa_id === empresaId);
  }, [beneficiarios, empresaId]);

  const empresa = useMemo(() => empresas.find(e => e.id === empresaId), [empresas, empresaId]);
  
  const titulares = useMemo(() => 
    beneficiariosDaEmpresa.filter(b => b.parentesco === 'TITULAR'), 
    [beneficiariosDaEmpresa]
  );

  const filteredBeneficiarios = useMemo(() => {
    return beneficiariosDaEmpresa
      .filter(b => (filter === 'Todos' || b.situacao === filter))
      .filter(b => b.nome_completo.toLowerCase().includes(searchTerm.toLowerCase()) || b.cpf.includes(searchTerm) || (b.saude_numero_carteirinha || '').includes(searchTerm) || (b.vida_numero_carteirinha || '').includes(searchTerm) || (b.odonto_numero_carteirinha || '').includes(searchTerm));
  }, [beneficiariosDaEmpresa, filter, searchTerm]);
  
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchTerm]);

  // Pagination Logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentBeneficiarios = filteredBeneficiarios.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBeneficiarios.length / itemsPerPage);

  const metrics = useMemo(() => ({
      total: beneficiariosDaEmpresa.length,
      titulares: beneficiariosDaEmpresa.filter(b => b.parentesco === 'TITULAR').length,
      dependentes: beneficiariosDaEmpresa.filter(b => b.parentesco !== 'TITULAR').length,
      ativos: beneficiariosDaEmpresa.filter(b => b.situacao === 'ATIVO').length,
  }), [beneficiariosDaEmpresa]);
  
  const solicitacoesInclusaoConcluidas = useMemo(() => 
    solicitacoes.filter(s => s.empresa_id === parseInt(empresaId) && s.status === 'CONCLUIDA' && s.tipo_solicitacao === 'INCLUSAO'),
    [solicitacoes, empresaId]
  );

  const solicitacoesExclusaoConcluidas = useMemo(() => 
    solicitacoes.filter(s => s.empresa_id === parseInt(empresaId) && s.status === 'CONCLUIDA' && s.tipo_solicitacao === 'EXCLUSAO'),
    [solicitacoes, empresaId]
  );

  useEffect(() => { setAge(formData.data_nascimento ? calculateAge(formData.data_nascimento) : ''); }, [formData.data_nascimento]);

  const openModalToAdd = () => { setEditingBeneficiario(null); setFormData(emptyBeneficiario); setIsModalOpen(true); };
  const openModalToEdit = (b) => { setEditingBeneficiario(b); setFormData({ ...emptyBeneficiario, ...b }); setIsModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = [];
    if (!formData.nome_completo) errors.push('Nome Completo');
    if (!formData.cpf) errors.push('CPF');
    if (!formData.parentesco) errors.push('Parentesco');
    if (formData.parentesco !== 'TITULAR' && !formData.nome_titular) errors.push('Nome do Titular');
    if (formData.situacao === 'INATIVO' && !formData.data_inatividade) {
      errors.push('Data de Inatividade');
    }
    if (formData.situacao === 'AFASTADO' && (!formData.data_afastamento || !formData.motivo_afastamento)) {
      errors.push('Data e Motivo do Afastamento');
    }

    if (errors.length > 0) {
      toast({ variant: 'destructive', title: 'Campos Obrigatórios', description: `Por favor, preencha: ${errors.join(', ')}.` });
      return;
    }
    const unmaskedCpf = formData.cpf.replace(/\D/g, '');
    if (beneficiarios.some(b => b.empresa_id === empresaId && b.cpf.replace(/\D/g, '') === unmaskedCpf && b.id !== editingBeneficiario?.id)) {
      toast({ variant: "destructive", title: "Erro de Validação", description: "CPF já cadastrado nesta empresa." });
      return;
    }
    if (user.perfil !== 'CLIENTE' && formData.situacao === 'ATIVO' && !formData.saude_ativo && !formData.vida_ativo && !formData.odonto_ativo) {
      toast({ variant: 'destructive', title: 'Erro de Validação', description: 'Beneficiários ATIVOS precisam ter ao menos um plano.' });
      return;
    }
    
    setIsSubmitting(true);
    const dataToSave = { ...formData, saude_valor_fatura: Number(formData.saude_valor_fatura) || 0, vida_valor_fatura: Number(formData.vida_valor_fatura) || 0, odonto_valor_fatura: Number(formData.odonto_valor_fatura) || 0, empresa_id: empresaId };
    
    try {
      if (editingBeneficiario) {
        await beneficiariosService.updateBeneficiario(editingBeneficiario.id, dataToSave);
        setBeneficiarios(prev => prev.map(b => b.id === editingBeneficiario.id ? { ...dataToSave, id: b.id } : b));
        toast({ title: 'Sucesso', description: 'Beneficiário atualizado.' });
      } else {
        const created = await beneficiariosService.createBeneficiario(dataToSave);
        setBeneficiarios(prev => [...prev, created]);
        toast({ title: 'Sucesso', description: 'Beneficiário adicionado.' });
      }
      setIsModalOpen(false);
    } catch (error) {
       toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao salvar beneficiário.' });
    } finally {
       setIsSubmitting(false);
    }
  };
  
  const deleteBeneficiario = async (id) => {
    try {
        await beneficiariosService.deleteBeneficiario(id);
        setBeneficiarios(beneficiarios.filter(b => b.id !== id));
        toast({ title: 'Sucesso', description: 'Beneficiário excluído permanentemente.' });
    } catch(error) {
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao excluir beneficiário.' });
    }
  };

  const handleSolicitarInclusao = async (beneficiarioId, planosSelecionados) => {
    if (!planosSelecionados || planosSelecionados.length === 0) return;

    // Filter out plans that already have pending or processing requests
    const validPlans = planosSelecionados.filter(plano => {
      const hasDuplicate = solicitacoes.some(s => 
        s.beneficiario_id === beneficiarioId && 
        s.tipo_plano === plano && 
        s.tipo_solicitacao === 'INCLUSAO' && 
        ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
      );
      
      if (hasDuplicate) {
        toast({
          variant: 'destructive',
          title: 'Solicitação Duplicada',
          description: `Já existe uma solicitação em andamento para o plano ${plano}.`,
        });
      }
      return !hasDuplicate;
    });

    if (validPlans.length === 0) return;

    try {
        const promises = validPlans.map((plano) => {
            const novaSolicitacao = {
              beneficiario_id: beneficiarioId,
              empresa_id: parseInt(empresaId),
              usuario_solicitante_id: user.id,
              tipo_plano: plano,
              tipo_solicitacao: 'INCLUSAO',
              status: 'PENDENTE',
              data_solicitacao: new Date().toISOString(),
              data_aprovacao: null
            };
            return solicitacoesService.createSolicitacao(novaSolicitacao);
        });

        const newSolicitacoes = await Promise.all(promises);
        setSolicitacoes(prev => [...prev, ...newSolicitacoes]);
      
        toast({
          title: 'Solicitações Enviadas!',
          description: `Solicitações de inclusão para os planos ${validPlans.join(', ')} foram enviadas com sucesso.`,
        });
    } catch (error) {
        console.error("Erro ao enviar solicitação:", error);
        toast({ variant: 'destructive', title: 'Erro', description: 'Falha ao enviar solicitação.' });
    }
  };

  const handleSolicitarExclusao = async (beneficiarioId, tipoPlano, motivo, dataExclusao) => {
    // 1. Check for duplicates
    const hasOpenExclusion = solicitacoes.some(s => 
      s.beneficiario_id === beneficiarioId && 
      s.tipo_plano === tipoPlano && 
      s.tipo_solicitacao === 'EXCLUSAO' && 
      ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
    );

    if (hasOpenExclusion) {
      toast({ 
        variant: 'destructive', 
        title: 'Solicitação Duplicada', 
        description: 'Já existe uma solicitação de exclusão em andamento para este plano.' 
      });
      return;
    }

    // 2. Validate dataExclusao
    if (!dataExclusao) {
      toast({ 
        variant: 'destructive', 
        title: 'Data Obrigatória', 
        description: 'Por favor, informe a data de exclusão.' 
      });
      return;
    }

    // 3. Validate motivo
    if (!motivo || motivo.length < 3) {
      toast({ 
        variant: 'destructive', 
        title: 'Motivo Obrigatório', 
        description: 'Por favor, informe o motivo da exclusão (mínimo 3 caracteres).' 
      });
      return;
    }

    try {
      // 4. Create object
      const novaSolicitacao = {
        beneficiario_id: beneficiarioId,
        empresa_id: parseInt(empresaId),
        usuario_solicitante_id: user.id,
        tipo_plano: tipoPlano,
        tipo_solicitacao: 'EXCLUSAO',
        status: 'PENDENTE',
        data_solicitacao: new Date().toISOString(),
        dados_exclusao: {
          dataExclusao,
          motivo
        }
      };

      // 5. Call service
      const createdRequest = await solicitacoesService.createSolicitacao(novaSolicitacao);

      // 6. Update state
      setSolicitacoes(prev => [...prev, createdRequest]);

      // 7. Show success toast
      toast({ 
        title: 'Solicitação Enviada', 
        description: `A exclusão do plano ${tipoPlano} foi solicitada com sucesso.` 
      });

      // 8 & 9. Close modal and reset data
      setIsExclusaoModalOpen(false);
      setExclusaoData({ beneficiarioId: null, tipoPlano: null, motivo: '', dataExclusao: '' });

    } catch (error) {
      console.error('Erro ao solicitar exclusão:', error);
      // 9. Handle errors
      toast({ 
        variant: 'destructive', 
        title: 'Erro', 
        description: 'Não foi possível enviar a solicitação de exclusão. Tente novamente.' 
      });
    }
  };

  const handleSolicitarAlteracao = (beneficiarioId, tipoPlano) => {
    const hasOpenAlteracao = solicitacoes.some(s => 
      s.beneficiario_id === beneficiarioId && 
      s.tipo_plano === tipoPlano && 
      s.tipo_solicitacao === 'ALTERACAO' && 
      ['PENDENTE', 'EM PROCESSAMENTO'].includes(s.status)
    );

    if (hasOpenAlteracao) {
      toast({ 
        variant: 'destructive', 
        title: 'Solicitação já existente', 
        description: 'Já existe uma solicitação de alteração em andamento para este plano.' 
      });
      return;
    }

    setAlteracaoData({ beneficiarioId, tipoPlano });
    setIsAlteracaoModalOpen(true);
  };

  const confirmAlteracao = async () => {
    const { beneficiarioId, tipoPlano } = alteracaoData;
    if (!beneficiarioId || !tipoPlano) return;

    try {
      const novaSolicitacao = {
        beneficiario_id: beneficiarioId,
        empresa_id: parseInt(empresaId),
        usuario_solicitante_id: user.id,
        tipo_plano: tipoPlano,
        tipo_solicitacao: 'ALTERACAO',
        status: 'PENDENTE',
        data_solicitacao: new Date().toISOString(),
        data_aprovacao: null
      };
      
      const created = await solicitacoesService.createSolicitacao(novaSolicitacao);
      setSolicitacoes(prev => [...prev, created]);

      toast({ 
        title: 'Solicitação de Alteração Enviada', 
        description: `Sua solicitação para alterar o plano ${tipoPlano} foi enviada com sucesso.` 
      });

      setIsAlteracaoModalOpen(false);
      setAlteracaoData({ beneficiarioId: null, tipoPlano: null });
    } catch (error) {
      console.error('Erro ao enviar solicitação de alteração:', error);
      toast({ 
        variant: 'destructive', 
        title: 'Erro', 
        description: 'Não foi possível enviar a solicitação de alteração. Tente novamente.' 
      });
    }
  };

  const getLatestSolicitacaoForPlan = (beneficiarioId, tipoPlano) => {
    const userSolicitacoes = solicitacoes.filter(s => 
      String(s.beneficiario_id) === String(beneficiarioId) && 
      String(s.tipo_plano) === String(tipoPlano)
    );

    if (userSolicitacoes.length === 0) return null;

    userSolicitacoes.sort((a, b) => 
      new Date(b.data_solicitacao) - new Date(a.data_solicitacao)
    );

    return userSolicitacoes[0];
  };

  const openSolicitacaoDialog = () => { setSelectedPlans([]); setIsSolicitacaoDialogOpen(true); };
  
  const togglePlanSelection = (plan) => {
    setSelectedPlans(prev => prev.includes(plan) ? prev.filter(p => p !== plan) : [...prev, plan]);
  };

  const confirmSolicitacao = () => {
    if (selectedPlans.length === 0) return toast({ variant: 'destructive', title: 'Selecione um plano', description: 'Selecione ao menos um plano para solicitar.' });
    handleSolicitarInclusao(editingBeneficiario.id, selectedPlans);
    setIsSolicitacaoDialogOpen(false);
    setSelectedPlans([]);
  };

  const renderPlanSelectionItem = (type, label, Icon, colorClass) => {
    const isActive = formData[`${type}_ativo`];
    const solicitacao = getLatestSolicitacaoForPlan(editingBeneficiario.id, type);
    const isPendingOrProcessing = solicitacao && ['PENDENTE', 'EM PROCESSAMENTO'].includes(solicitacao.status);

    if (isPendingOrProcessing) {
        return (
            <div key={type} className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 space-y-3 relative">
                 <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${colorClass} bg-opacity-10`}><Icon className={`h-4 w-4 ${colorClass}`} /></div>
                    <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                 </div>
                 <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100 shadow-none">
                        {solicitacao.status === 'PENDENTE' ? 'Solicitação Pendente' : 'Em Processamento'}
                    </Badge>
                    <span className="text-xs text-gray-500 font-medium">
                        {formatDate(solicitacao.data_solicitacao)}
                    </span>
                 </div>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSolicitacaoDialogOpen(false)} 
                    className="w-full h-8 text-xs border-yellow-300 text-yellow-800 hover:bg-yellow-100 hover:text-yellow-900 bg-transparent"
                 >
                    Fechar
                 </Button>
            </div>
        );
    }

    if (isActive) {
        return (
             <div key={type} className="border border-green-200 bg-green-50 rounded-lg p-4 space-y-3 relative">
                 <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-full ${colorClass} bg-opacity-10`}><Icon className={`h-4 w-4 ${colorClass}`} /></div>
                    <h3 className="font-semibold text-sm text-gray-900">{label}</h3>
                 </div>
                 <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Plano Ativo</span>
                 </div>
                 <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSolicitacaoDialogOpen(false)} 
                    className="w-full h-8 text-xs border-green-300 text-green-800 hover:bg-green-100 hover:text-green-900 bg-transparent"
                 >
                    Fechar
                 </Button>
            </div>
        );
    }

    return (
        <div 
            key={type} 
            className={`flex items-center space-x-3 border p-4 rounded-lg transition-all cursor-pointer ${selectedPlans.includes(type) ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-gray-50 border-gray-200'}`} 
            onClick={() => togglePlanSelection(type)}
        >
            <Checkbox 
                id={`check_${type}`} 
                checked={selectedPlans.includes(type)} 
                onCheckedChange={() => togglePlanSelection(type)} 
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" 
            />
            <div className="flex-1 cursor-pointer pointer-events-none select-none">
                 <Label htmlFor={`check_${type}`} className="font-medium flex items-center gap-2 cursor-pointer text-gray-700">
                    <Icon className={`h-4 w-4 ${colorClass}`} />
                    {label}
                 </Label>
            </div>
        </div>
    );
  };

  const renderPlanStatusCard = (type, label, Icon, colorClass) => {
    if (!editingBeneficiario) return null;
    const solicitacao = getLatestSolicitacaoForPlan(editingBeneficiario.id, type);
    
    if (!solicitacao && !formData[`${type}_ativo`]) return null;
    
    if (!solicitacao) {
      if (formData[`${type}_ativo`]) {
        return (
          <Card className="mb-4 overflow-hidden border-l-4 border-l-green-500">
             <CardHeader className="p-4 pb-2">
                <div className="flex items-center gap-2"><div className={`p-2 rounded-full ${colorClass} bg-opacity-10`}><Icon className={`h-5 w-5 ${colorClass}`} /></div><div><h4 className="font-bold text-sm flex items-center gap-2">{label}</h4><Badge variant="outline" className="w-fit bg-green-100 text-green-800 border-green-200">Ativo</Badge></div></div>
             </CardHeader>
             <CardContent className="p-4 pt-2">
                <div className="text-sm text-gray-600 mb-4">Este plano está ativo.</div>
                <div className="flex flex-col gap-2"><Button variant="outline" size="sm" className="h-8 px-3 text-blue-600 border-blue-600 hover:bg-blue-50 w-full justify-start" onClick={() => handleSolicitarAlteracao(editingBeneficiario.id, type)}><RotateCcw className="h-4 w-4 mr-2" />Alterar Plano</Button><Button variant="destructive" size="sm" className="h-8 px-3 w-full justify-start" onClick={() => { setExclusaoData({ beneficiarioId: editingBeneficiario.id, tipoPlano: type, motivo: '', dataExclusao: '' }); setIsExclusaoModalOpen(true); }}><UserMinus className="h-4 w-4 mr-2" />Solicitar Exclusão</Button></div>
             </CardContent>
          </Card>
        );
      }
      return null;
    }

    const status = solicitacao.status;
    const isRejected = status === 'REJEITADA';
    const isExclusion = solicitacao.tipo_solicitacao === 'EXCLUSAO';

    return (
      <Card className="mb-4 overflow-hidden border-l-4" style={{ borderLeftColor: isRejected ? '#ef4444' : (status === 'CONCLUIDA' ? (isExclusion ? '#ef4444' : '#22c55e') : (status === 'EM PROCESSAMENTO' ? '#3b82f6' : '#eab308')) }}>
        <CardHeader className="p-4 pb-2"><div className="flex items-center gap-2"><div className={`p-2 rounded-full ${colorClass} bg-opacity-10`}><Icon className={`h-5 w-5 ${colorClass}`} /></div><div><h4 className="font-bold text-sm flex items-center gap-2">{label}{isExclusion && (<Badge variant="destructive" className="ml-1 text-[10px] h-5 px-1">➖ EXCLUSÃO</Badge>)}</h4><div className="flex flex-col mt-1"><Badge variant="outline" className={`w-fit ${getStatusColor(status)}`}>{status === 'PENDENTE' && (isExclusion ? 'Exclusão Pendente' : 'Inclusão Pendente')}{status === 'EM PROCESSAMENTO' && (isExclusion ? 'Exclusão em Andamento' : 'Inclusão em Andamento')}{status === 'CONCLUIDA' && (isExclusion ? 'Exclusão Concluída' : 'Inclusão Concluída')}{status === 'REJEITADA' && 'Solicitação Rejeitada'}</Badge></div></div></div></CardHeader>
        <CardContent className="p-4 pt-2">
          <div className="grid grid-cols-2 gap-y-2 text-sm text-gray-600 mb-3"><div className="flex items-center gap-2" title="Data Solicitação"><Calendar className="h-4 w-4" /><span>{formatDate(solicitacao.data_solicitacao)}</span></div><div className="flex items-center gap-2" title="Tempo Decorrido"><Timer className="h-4 w-4" /><span>{getTempoDecorrido(solicitacao.data_solicitacao)}</span></div>{solicitacao.data_aprovacao && !isExclusion && (<div className="flex items-center gap-2 col-span-2" title="Data Aprovação"><CheckCircle2 className="h-4 w-4 text-green-600" /><span>Aprovado: {formatDate(solicitacao.data_aprovacao)}</span></div>)}</div>
          {isExclusion && status === 'CONCLUIDA' && (<div className="mt-3 p-3 bg-red-50 rounded border border-red-200"><p className="text-sm font-semibold text-red-800 flex items-center gap-2"><UserMinus className="h-4 w-4" /> Plano Excluído</p><p className="text-xs text-red-700 mt-1">Data: {formatDate(solicitacao.data_conclusao)}</p>{solicitacao.dados_exclusao?.motivo && (<p className="text-xs text-red-700">Motivo: {solicitacao.dados_exclusao.motivo}</p>)}</div>)}
          {isRejected && (<div className="space-y-3"><Alert variant="destructive" className="py-2"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-xs ml-2">{solicitacao.motivo_rejeicao || 'Motivo não informado.'}</AlertDescription></Alert></div>)}
          {formData[`${type}_ativo`] === true && status === 'CONCLUIDA' && !isExclusion && (<div className="flex flex-col gap-2 mt-4 pt-3 border-t"><Button variant="outline" size="sm" className="h-8 px-3 text-blue-600 border-blue-600 hover:bg-blue-50 w-full justify-start" onClick={() => handleSolicitarAlteracao(editingBeneficiario.id, type)}><RotateCcw className="h-4 w-4 mr-2" />Alterar Plano</Button><Button variant="destructive" size="sm" className="h-8 px-3 w-full justify-start" onClick={() => { setExclusaoData({ beneficiarioId: editingBeneficiario.id, tipoPlano: type, motivo: '', dataExclusao: '' }); setIsExclusaoModalOpen(true); }}><UserMinus className="h-4 w-4 mr-2" />Solicitar Exclusão</Button></div>)}
        </CardContent>
      </Card>
    );
  };
  
  const getBadgeClass = (situacao) => { 
    switch (situacao) { 
        case 'ATIVO': return 'bg-green-100 text-green-800 border-green-200 hover:bg-green-100'; 
        case 'INATIVO': return 'bg-red-100 text-red-800 border-red-200 hover:bg-red-100'; 
        case 'AFASTADO': return 'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100'; 
        default: return 'bg-gray-100 text-gray-800 border-gray-200'; 
    } 
  };

  // 2. Conditional Returns (Guards) - MOVED TO END
  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!empresaId_num || isNaN(empresaId_num)) {
    return <Navigate to="/select-company" />;
  }

  if (user.perfil === 'CLIENTE') {
    const matriz = empresas.find(e => e.id === user.empresa_matriz_id);
    const filiais = empresas.filter(e => e.empresa_matriz_id === user.empresa_matriz_id);
    const accessibleEmpresasIds = [matriz?.id, ...filiais.map(f => f.id)].filter(Boolean);
    if (empresas.length > 0 && !accessibleEmpresasIds.includes(empresaId)) { return <Navigate to="/select-company" replace />; }
  }

  if (!empresa && !isLoading && empresas.length > 0) { 
      return <DashboardLayout><div className="text-center"><h1 className="text-2xl font-bold">Empresa não encontrada.</h1></div></DashboardLayout>; 
  }

  return (
    <>
      <Helmet><title>Beneficiários - {empresa?.nome_fantasia || 'Cliente'}</title></Helmet>
      <DashboardLayout>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
          {solicitacoesInclusaoConcluidas.length > 0 && showInclusaoAlert && (<Alert className="mb-4 bg-blue-50 border-blue-200 relative pr-10"><AlertTitle className="text-blue-800">Solicitações de Inclusão Concluídas!</AlertTitle><AlertDescription className="text-blue-700">Boas notícias! Algumas solicitações de planos foram aprovadas e os planos já estão ativos.</AlertDescription><button onClick={() => setShowInclusaoAlert(false)} className="absolute top-2 right-2 text-blue-800 hover:text-blue-900"><X className="h-4 w-4" /></button></Alert>)}
          {solicitacoesExclusaoConcluidas.length > 0 && showExclusaoAlert && (<Alert className="mb-4 bg-red-50 border-red-200 relative pr-10"><AlertTitle className="text-red-800">Solicitações de Exclusão Concluídas!</AlertTitle><AlertDescription className="text-red-700">Alguns planos foram excluídos com sucesso.</AlertDescription><button onClick={() => setShowExclusaoAlert(false)} className="absolute top-2 right-2 text-red-800 hover:text-red-900"><X className="h-4 w-4" /></button></Alert>)}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
             {isLoading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px]" />) : (
                <>
                  <MetricCard title="Total de Beneficiários" value={metrics.total} icon={Users} color="text-gray-600" />
                  <MetricCard title="Titulares" value={metrics.titulares} icon={User} color="text-blue-600" />
                  <MetricCard title="Dependentes" value={metrics.dependentes} icon={Users} color="text-purple-600" />
                  <MetricCard title="Beneficiários Ativos" value={metrics.ativos} icon={UserCheck} color="text-green-600" />
                </>
             )}
          </div>
          
          <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <CardTitle>Beneficiários</CardTitle>
                    <div className="flex items-center gap-2 w-full md:w-auto flex-wrap justify-end">
                        <div className="relative w-full sm:w-auto flex-grow sm:flex-grow-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input placeholder="Buscar por nome, CPF ou carteirinha..." className="pl-10 w-full sm:w-64" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <Select value={filter} onValueChange={setFilter}>
                            <SelectTrigger className="w-full sm:w-[120px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Todos">Todos</SelectItem>
                                <SelectItem value="ATIVO">Ativos</SelectItem>
                                <SelectItem value="INATIVO">Inativos</SelectItem>
                                <SelectItem value="AFASTADO">Afastados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button onClick={openModalToAdd} className="w-full sm:w-auto bg-[#003580] hover:bg-[#002060] text-white"><Plus className="mr-2 h-4 w-4" /> Adicionar</Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                     <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                     </div>
                ) : filteredBeneficiarios.length > 0 ? (
                    <>
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome Completo</TableHead>
                                        <TableHead>CPF</TableHead>
                                        <TableHead>Parentesco</TableHead>
                                        <TableHead>Planos Ativos</TableHead>
                                        <TableHead>Situação</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {currentBeneficiarios.map((b) => (
                                        <TableRow key={b.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex flex-col">
                                                    <span>{b.nome_completo}</span>
                                                    {b.parentesco !== 'TITULAR' && <span className="text-xs text-gray-500">Titular: {b.nome_titular}</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell>{b.cpf}</TableCell>
                                            <TableCell>{b.parentesco}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    {b.saude_ativo && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Saúde</Badge>}
                                                    {b.vida_ativo && <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Vida</Badge>}
                                                    {b.odonto_ativo && <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">Odonto</Badge>}
                                                    {!b.saude_ativo && !b.vida_ativo && !b.odonto_ativo && <span className="text-gray-400 text-xs">-</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell><Badge className={getBadgeClass(b.situacao)} variant="secondary">{b.situacao}</Badge></TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" onClick={() => openModalToEdit(b)} title="Editar"><Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" /></Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Excluir"><Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" /></Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                                                <AlertDialogDescription>Esta ação é permanente e não pode ser desfeita. Tem certeza que deseja excluir <strong>{b.nome_completo}</strong>?</AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => deleteBeneficiario(b.id)} className={buttonVariants({ variant: "destructive" })}>Excluir</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        
                        {/* Pagination Controls */}
                        <div className="flex items-center justify-end space-x-2 py-4">
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))} disabled={currentPage === 1}>Anterior</Button>
                            <div className="text-sm text-gray-600">Página {currentPage} de {totalPages}</div>
                            <Button variant="outline" size="sm" onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}>Próxima</Button>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                         <div className="bg-gray-100 p-4 rounded-full mb-4"><Search className="h-8 w-8 text-gray-400" /></div>
                         <h3 className="text-lg font-medium text-gray-900">Nenhum beneficiário encontrado</h3>
                         <p className="text-gray-500 max-w-sm mt-1">Não encontramos beneficiários com os filtros atuais. Tente mudar o termo de busca ou adicionar um novo.</p>
                         <Button onClick={openModalToAdd} variant="link" className="mt-2">Adicionar novo beneficiário</Button>
                    </div>
                )}
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}><DialogContent className="max-w-2xl w-[90vw] max-h-[90vh] overflow-hidden p-0 flex flex-col"><DialogHeader className="px-4 pt-4"><DialogTitle>{editingBeneficiario ? 'Editar' : 'Adicionar'} Beneficiário</DialogTitle></DialogHeader><form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">{isModalOpen && <ModalFormContent formData={formData} setFormData={setFormData} age={age} titulares={titulares} beneficiario={editingBeneficiario} isCliente={user.perfil === 'CLIENTE'} openSolicitacaoDialog={openSolicitacaoDialog} renderPlanStatusCard={renderPlanStatusCard} setIsExclusaoModalOpen={setIsExclusaoModalOpen} setExclusaoData={setExclusaoData} handleSolicitarAlteracao={handleSolicitarAlteracao} />}<DialogFooter className="px-4 mt-4 pb-4"><Button type="submit" disabled={isSubmitting} className="bg-[#003580] hover:bg-[#002060] text-white">{isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button></DialogFooter></form></DialogContent></Dialog>
        {editingBeneficiario && user.perfil === 'CLIENTE' && (<Dialog open={isSolicitacaoDialogOpen} onOpenChange={(open) => { if (!open) setIsSolicitacaoDialogOpen(false); }}><DialogContent className="sm:max-w-[425px] max-h-[80vh] overflow-y-auto"><DialogHeader><DialogTitle>Solicitar Inclusão</DialogTitle><DialogDescription>Selecione os planos que deseja solicitar para este beneficiário.</DialogDescription></DialogHeader><div className="py-4 space-y-4">{renderPlanSelectionItem('saude', 'Plano de Saúde', Hospital, 'text-green-600')}{renderPlanSelectionItem('vida', 'Seguro de Vida', Heart, 'text-blue-600')}{renderPlanSelectionItem('odonto', 'Plano Odonto', Smile, 'text-orange-600')}</div><DialogFooter><Button variant="outline" onClick={() => setIsSolicitacaoDialogOpen(false)}>Fechar</Button><Button onClick={confirmSolicitacao}>Confirmar Solicitação</Button></DialogFooter></DialogContent></Dialog>)}
        <Dialog open={isExclusaoModalOpen} onOpenChange={setIsExclusaoModalOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar Exclusão de Plano</DialogTitle></DialogHeader><div className="grid gap-4 py-4"><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="dataExclusao" className="text-right">Data da Exclusão</Label><Input id="dataExclusao" type="date" value={exclusaoData.dataExclusao} onChange={(e) => setExclusaoData({...exclusaoData, dataExclusao: e.target.value})} className="col-span-3" /></div><div className="grid grid-cols-4 items-center gap-4"><Label htmlFor="motivo" className="text-right">Motivo</Label><Textarea id="motivo" value={exclusaoData.motivo} onChange={(e) => setExclusaoData({...exclusaoData, motivo: e.target.value})} className="col-span-3" /></div></div><DialogFooter><Button variant="outline" onClick={() => setIsExclusaoModalOpen(false)}>Cancelar</Button><Button onClick={() => { handleSolicitarExclusao(exclusaoData.beneficiarioId, exclusaoData.tipoPlano, exclusaoData.motivo, exclusaoData.dataExclusao); }}>Enviar Solicitação</Button></DialogFooter></DialogContent></Dialog>
        <Dialog open={isAlteracaoModalOpen} onOpenChange={setIsAlteracaoModalOpen}><DialogContent><DialogHeader><DialogTitle>Solicitar Alteração de Plano</DialogTitle><DialogDescription>Você está solicitando a alteração do plano <strong>{alteracaoData.tipoPlano}</strong>.</DialogDescription></DialogHeader><div className="py-4 text-sm text-gray-600"><p>Ao confirmar, uma solicitação de alteração será enviada para a administração.</p><p className="mt-2">Você poderá acompanhar o status desta solicitação no painel do beneficiário.</p></div><DialogFooter><Button variant="outline" onClick={() => setIsAlteracaoModalOpen(false)}>Cancelar</Button><Button onClick={confirmAlteracao} className="bg-blue-600 hover:bg-blue-700 text-white">Confirmar Alteração</Button></DialogFooter></DialogContent></Dialog>

      </DashboardLayout>
    </>
  );
};

export default ClientDashboard;