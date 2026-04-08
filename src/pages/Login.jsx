import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { useToast } from '@/components/ui/use-toast';
import { Helmet } from 'react-helmet';
import { authService } from '@/services/authService';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { updateUser } = useAuth(); // Assuming updateUser updates the context state and localStorage
  const navigate = useNavigate();
  const { toast } = useToast();

  const logoUrl = "https://horizons-cdn.hostinger.com/2e9adf63-57d2-437e-87b2-25ae49f4c5b7/dc37b5512fc0e73a5c418dd52548e59c.png";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
        const user = await authService.loginUser(email, password);
        
        if (!user) {
          throw new Error('Credenciais inválidas.');
        }

        // Remove password from object before saving (authService might already return raw data)
        const { password: _, ...safeUser } = user;
        
        updateUser(safeUser); // Updates context and localStorage
        
        toast({
            title: "Login bem-sucedido!",
            description: `Bem-vindo de volta, ${user.email}! Redirecionando...`,
            className: "bg-green-600 border-green-700 text-white"
        });

        if (safeUser.must_change_password) {
          navigate('/force-change-password');
        } else if (user.perfil === 'CEO') navigate('/ceo');
        else if (user.perfil === 'ADM') navigate('/admin');
        else if (user.perfil === 'CLIENTE') navigate('/select-segmento');
    } catch (error) {
        console.error("Login error caught in component:", error);
        toast({
            variant: "destructive",
            title: "Falha no login",
            description: error.message === 'Credenciais inválidas.' 
              ? "E-mail ou senha incorretos." 
              : "Erro no sistema. Por favor, tente novamente.",
        });
    } finally {
        setIsLoggingIn(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - Ágil Seguros</title>
        <meta name="description" content="Acesse sua conta no sistema Ágil Seguros." />
      </Helmet>
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-soft-gradient">
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-center w-full max-w-sm"
        >
          {/* Logo fora do card */}
          <img
            src="https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png"
            alt="Ágil Seguros"
            className="h-24 w-auto object-contain mb-6"
          />

          <Card className="w-full bg-white/90 border-0 backdrop-blur-md shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardDescription className="text-gray-500">Entre para gerenciar seus dados</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="border-[#c8e0f5] focus:border-[#003580] bg-[#f0f7ff]"
                  />
                </div>
                <Button type="submit" className="w-full rounded-full font-bold text-white" style={{ background: '#003580' }} disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Entrando...
                    </>
                  ) : 'Entrar'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </>
  );
};

export default LoginPage;