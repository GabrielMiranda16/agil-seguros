import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation, useParams, NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { 
  LogOut, 
  Repeat, 
  ChevronsRight, 
  ArrowLeft, 
  Calendar, 
  Clock, 
  DollarSign,
  Lock,
  Loader2,
  User
} from 'lucide-react';
import useDateTime from '@/hooks/use-date-time';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import ChatWidget from '@/components/ChatWidget';
import { empresasService } from '@/services/empresasService';
import { solicitacoesService } from '@/services/solicitacoesService';
import { authService } from '@/services/authService';
import { validatePasswordStrength } from '@/lib/userValidator';
import { supabaseClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const DashboardLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { empresaId } = useParams();
  const { toast } = useToast();
  
  const [empresas, setEmpresas] = useState([]);
  const [solicitacoes, setSolicitacoes] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const { formattedDate, formattedTime } = useDateTime('America/Sao_Paulo');

  useEffect(() => {
    const loadData = async () => {
      setLoadingData(true);
      try {
        const [empData, solData, usersResult] = await Promise.all([
          empresasService.getEmpresas(),
          solicitacoesService.getAllSolicitacoes(),
          supabaseClient.from('users').select('*')
        ]);
        
        setEmpresas(empData || []);
        setSolicitacoes(solData || []);
        
        if (usersResult.data) {
          setUsers(usersResult.data);
        }
      } catch (error) {
        console.error("Error loading dashboard data:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadData();
  }, []);

  // Password Modal States
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isPassSubmitting, setIsPassSubmitting] = useState(false);

  const pendingCount = solicitacoes.filter(s => s.status === 'PENDENTE').length;

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

  const getHomeLink = () => {
    if (!user) return '/login';
    switch (user.perfil) {
      case 'CEO': return '/ceo';
      case 'ADM': return '/admin';
      case 'CLIENTE': return '/select-segmento';
      default: return '/login';
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleGoBack = () => {
    if (user?.perfil === 'CEO') {
      navigate('/ceo');
    } else if (user?.perfil === 'ADM') {
      navigate('/admin');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const userInStorage = users.find(u => String(u.id) === String(user.id));
    if (!userInStorage) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Usuário não encontrado.' });
      return;
    }

    // Suporta senhas em bcrypt (novas) e texto puro (legado)
    const storedPassword = userInStorage.password || '';
    const isBcrypt = storedPassword.startsWith('$2');
    const isOldCorrect = isBcrypt
      ? await bcrypt.compare(oldPassword, storedPassword)
      : oldPassword === storedPassword;

    if (!isOldCorrect) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Senha antiga incorreta.' });
      return;
    }
    const passErrors = validatePasswordStrength(newPassword);
    if (passErrors.length > 0) {
      toast({ variant: 'destructive', title: 'Senha fraca', description: passErrors[0] });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ variant: 'destructive', title: 'Erro', description: 'A confirmação não confere.' });
      return;
    }

    setIsPassSubmitting(true);
    try {
      await authService.updateUser(user.id, { password: newPassword });
      toast({ title: 'Sucesso', description: 'Senha alterada com sucesso.' });
      setIsPasswordModalOpen(false);
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível salvar a nova senha.' });
    } finally {
      setIsPassSubmitting(false);
    }
  };

  const isClientDashboard = location.pathname.startsWith('/cliente/');
  const isAdminViewingClient = (user?.perfil === 'CEO' || user?.perfil === 'ADM') && isClientDashboard;
  const currentEmpresa = isClientDashboard ? empresas.find(e => e.id === Number(empresaId)) : null;

  return (
    <div className="min-h-screen flex flex-col bg-soft-gradient">
      <header className="z-40" style={{ background: 'transparent' }}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-24">
            <div className="flex items-center space-x-4">
              <Link to={getHomeLink()}>
                <img
                  src="https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png"
                  alt="Ágil Seguros"
                  className="h-24 w-auto object-contain"
                />
              </Link>
              {currentEmpresa && (
                  <div className="hidden md:flex items-center text-sm">
                    <ChevronsRight className="h-5 w-5 text-white/40 mx-1" />
                    <span className="font-semibold text-white/80 truncate max-w-xs">
                      {currentEmpresa.nome_fantasia || currentEmpresa.razao_social}
                    </span>
                    <Badge variant={currentEmpresa.tipo === 'MATRIZ' ? 'default' : 'secondary'} className="ml-2">{currentEmpresa.tipo}</Badge>
                  </div>
              )}
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
               <div className="hidden lg:flex items-center space-x-4 text-sm font-medium text-white/80">
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Calendar className="h-4 w-4 text-white/70" />
                    <span>{formattedDate}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full">
                    <Clock className="h-4 w-4 text-white/70" />
                    <span>{formattedTime} (Brasília)</span>
                  </div>
               </div>
              
              {/* Client Menu Link for Coparticipacao */}
              {isClientDashboard && empresaId && (
                <NavLink
                  to={`/cliente/${empresaId}/coparticipacao`}
                  className={({ isActive }) =>
                    `flex items-center p-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <DollarSign className="h-5 w-5 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Minha Coparticipação</span>
                </NavLink>
              )}

              {isAdminViewingClient && (
                <Button variant="ghost" size="sm" className="text-white/80 hover:text-white hover:bg-white/10 border border-white/20" onClick={handleGoBack}>
                  <ArrowLeft className="h-4 w-4 mr-0 sm:mr-2" />
                  <span className="hidden sm:inline">Voltar</span>
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center gap-2 px-2 hover:bg-white/10 text-white">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-white">{user?.email}</p>
                      <p className="text-xs text-blue-200 font-semibold">{user?.perfil}</p>
                    </div>
                    <User className="h-5 w-5 text-white/80" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button variant="ghost" className="w-full justify-start cursor-pointer font-normal" onClick={() => setIsPasswordModalOpen(true)}>
                      <Lock className="mr-2 h-4 w-4" />
                      Alterar Senha
                    </Button>
                  </DropdownMenuItem>
                  {isClientDashboard && user?.perfil === 'CLIENTE' && (
                    <DropdownMenuItem asChild>
                      <Button variant="ghost" className="w-full justify-start cursor-pointer font-normal" onClick={() => navigate('/select-company')}>
                        <Repeat className="mr-2 h-4 w-4" />
                        Trocar CNPJ
                      </Button>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Button variant="ghost" className="w-full justify-start cursor-pointer text-red-600 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sair
                    </Button>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <main className="flex-grow container mx-auto p-4 sm:p-6 lg:p-8">
        {children}
      </main>

      <ChatWidget />
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label>Senha antiga</Label>
              <Input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} />
            </div>
            <div>
              <Label>Nova senha</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              <div className="mt-2 bg-gray-50 rounded-lg p-2.5 space-y-1">
                {[
                  { ok: newPassword.length >= 6,            txt: 'Mínimo 6 caracteres' },
                  { ok: /[A-Z]/.test(newPassword),          txt: '1 letra maiúscula' },
                  { ok: /[a-z]/.test(newPassword),          txt: '1 letra minúscula' },
                  { ok: /[0-9]/.test(newPassword),          txt: '1 número' },
                  { ok: /[^a-zA-Z0-9]/.test(newPassword),   txt: '1 caractere especial' },
                ].map(({ ok, txt }) => (
                  <div key={txt} className={`flex items-center gap-1.5 text-xs ${ok ? 'text-green-600' : 'text-gray-400'}`}>
                    <span>{ok ? '✓' : '○'}</span> {txt}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <Label>Confirmar nova senha</Label>
              <Input type="password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isPassSubmitting}>
                {isPassSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;