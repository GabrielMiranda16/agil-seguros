import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCompany } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LogOut, Building, Store, User, Users, Users2, FileClock, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { applyCnpjMask } from '@/lib/masks';
import { supabaseClient } from '@/lib/supabase';

const SelectCompanyPage = () => {
    const { user, logout } = useAuth();
    const { setSelectedCompanyId } = useCompany();
    const navigate = useNavigate();
    
    const [beneficiarios, setBeneficiarios] = useState([]);
    const [solicitacoes, setSolicitacoes] = useState([]);
    
    const [companiesData, setCompaniesData] = useState({ matriz: null, userCompanies: [] });
    const [loading, setLoading] = useState(true);
    const { matriz, userCompanies } = companiesData;

    useEffect(() => {
        let mounted = true;

        const fetchCompanies = async () => {
            if (!user) return;
            
            try {
                // Buscar beneficiários e solicitações do Supabase
                const [beneficiariosData, solicitacoesData] = await Promise.all([
                  supabaseClient.from('beneficiarios').select('*'),
                  supabaseClient.from('solicitacoes').select('*')
                ]);

                if (beneficiariosData.error) throw beneficiariosData.error;
                if (solicitacoesData.error) throw solicitacoesData.error;

                if (mounted) {
                  setBeneficiarios(beneficiariosData.data || []);
                  setSolicitacoes(solicitacoesData.data || []);
                }

                // If user is a client and doesn't have a matrix ID, they can't see anything.
                // We check this early to avoid unnecessary fetches for invalid client states.
                if (!user.empresa_matriz_id && user.perfil === 'CLIENTE') {
                     if (mounted) {
                         setCompaniesData({ matriz: null, userCompanies: [] });
                         setLoading(false);
                     }
                     return;
                }

                const { data: empresasData, error } = await supabaseClient 
                  .from('empresas') 
                  .select('*'); 
                
                if (error) throw error; 

                if (!mounted) return;

                const matrizData = empresasData?.find(e => e.id === user.empresa_matriz_id); 
                
                if (user.perfil === 'CLIENTE') { 
                  const filiaisData = empresasData?.filter(e => e.empresa_matriz_id === user.empresa_matriz_id) || []; 
                  setCompaniesData({ 
                      matriz: matrizData, 
                      userCompanies: [matrizData, ...filiaisData].filter(Boolean) 
                  });
                } else {
                    // CEO / ADM - Show all MATRIZ companies
                    setCompaniesData({ 
                        matriz: null, 
                        userCompanies: empresasData?.filter(e => e.tipo === 'MATRIZ') || [] 
                    });
                }
            } catch (error) { 
                console.error('Error fetching empresas:', error); 
                if (mounted) setCompaniesData({ matriz: null, userCompanies: [] }); 
            } finally {
                if (mounted) setLoading(false);
            }
        };

        fetchCompanies();
        
        return () => { mounted = false; };
    }, [user]);

    const getCompanyStats = (empresaId) => {
        const companyBeneficiarios = beneficiarios.filter(b => Number(b.empresa_id) === Number(empresaId) && !(b.data_exclusao));
        const titulares = companyBeneficiarios.filter(b => b.parentesco === 'TITULAR').length;
        const dependentes = companyBeneficiarios.length - titulares;
        const pendingSolicitacoes = solicitacoes.filter(s => Number(s.empresa_id) === Number(empresaId) && s.status === 'PENDENTE').length;
        return {
            ativos: companyBeneficiarios.length,
            titulares: titulares,
            dependentes: dependentes,
            solicitacoesPendentes: pendingSolicitacoes
        };
    };

    const handleSelectCompany = (empresaId) => {
        setSelectedCompanyId(empresaId);
        navigate(`/cliente/${empresaId}`);
    };
    const handleLogout = () => { logout(); navigate('/login'); };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-soft-gradient">
                <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
        );
    }

    if (user.perfil === 'CLIENTE') {
        if (userCompanies.length === 0) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 p-4 text-white">
                    <h2 className="text-xl font-bold">Nenhuma empresa vinculada.</h2>
                    <p className="text-gray-400">Entre em contato com o administrador.</p>
                    <Button onClick={handleLogout} className="mt-4"><LogOut className="mr-2 h-4 w-4" /> Sair</Button>
                </div>
            );
        }
        if (userCompanies.length === 1) {
            // Use setTimeout to avoid state update during render
            setTimeout(() => setSelectedCompanyId(userCompanies[0].id), 0);
            return <Navigate to={`/cliente/${userCompanies[0].id}`} replace />;
        }
    }
    
    if (user.perfil === 'CEO') return <Navigate to="/ceo" replace />;
    if (user.perfil === 'ADM' && userCompanies.length <= 1) return <Navigate to="/admin" replace />;

    return (
        <>
            <Helmet>
                <title>Selecionar CNPJ - Seguros Ágil</title>
                <meta name="description" content="Selecione a matriz ou filial que você deseja gerenciar." />
            </Helmet>
            <div className="min-h-screen flex flex-col items-start justify-start bg-soft-gradient p-4 sm:p-8 text-gray-800">
                <div className="w-full flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Selecione o CNPJ</h1>
                        {user.perfil === 'CLIENTE' && <p className="text-lg text-gray-600">{matriz?.nome_fantasia || matriz?.razao_social}</p>}
                        {(user.perfil === 'ADM' || user.perfil === 'CEO') && <p className="text-lg text-gray-600">Selecione uma empresa para gerenciar</p>}
                    </div>
                    <Button variant="ghost" onClick={handleLogout} className="text-gray-600 hover:text-gray-900 hover:bg-gray-200">
                        <LogOut className="mr-2 h-4 w-4"/> Sair
                    </Button>
                </div>
                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
                    className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                    {userCompanies.map((company) => {
                       const stats = getCompanyStats(company.id);
                       const isMatriz = company.tipo === 'MATRIZ';
                       return (
                        <motion.div
                            key={company.id}
                            variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                            className="w-full relative"
                        >
                            <div
                                onClick={() => handleSelectCompany(company.id)}
                                className="w-full h-full text-left p-6 rounded-lg bg-white shadow-md hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer border border-gray-200 relative"
                            >
                                {stats.solicitacoesPendentes > 0 && (<div className="absolute top-0 right-0 -mt-2 -mr-2"><Badge className="bg-red-500 text-white rounded-full h-6 w-6 flex items-center justify-center shadow-sm z-10">{stats.solicitacoesPendentes}</Badge></div>)}

                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        {isMatriz ? <Building className="h-10 w-10 text-blue-500" /> : <Store className="h-10 w-10 text-green-500" />}
                                        <Badge className={isMatriz ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>{company.tipo}</Badge>
                                    </div>
                                    <p className="font-bold text-xl leading-tight mb-1 truncate pr-4">{company.nome_fantasia || company.razao_social}</p>
                                    <p className="text-sm text-gray-500 mb-4">{applyCnpjMask(company.cnpj)}</p>
                                    
                                    <div className="border-t border-gray-200 my-4"></div>

                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div className="flex items-center"><Users className="h-4 w-4 mr-2 text-gray-400" /> {stats.ativos} beneficiários ativos</div>
                                        <div className="flex items-center"><User className="h-4 w-4 mr-2 text-gray-400" /> {stats.titulares} titulares</div>
                                        <div className="flex items-center"><Users2 className="h-4 w-4 mr-2 text-gray-400" /> {stats.dependentes} dependentes</div>
                                        <div className="flex items-center"><FileClock className={`h-4 w-4 mr-2 ${stats.solicitacoesPendentes > 0 ? 'text-red-500' : 'text-gray-400'}`} />{stats.solicitacoesPendentes} solicitações pendentes</div>
                                    </div>
                                </div>
                                
                                <Button className="w-full mt-6 bg-gray-800 hover:bg-gray-900 text-white">
                                    Acessar
                                </Button>
                            </div>
                        </motion.div>
                    )})}
                </motion.div>
            </div>
        </>
    );
};

export default SelectCompanyPage;