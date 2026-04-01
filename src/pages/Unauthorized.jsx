import React from 'react';
    import { Helmet } from 'react-helmet';
    import { Button } from '@/components/ui/button';
    import { useNavigate } from 'react-router-dom';
    import { ShieldAlert } from 'lucide-react';
    
    const UnauthorizedPage = () => {
      const navigate = useNavigate();
    
      return (
        <>
          <Helmet>
            <title>Acesso Negado - Seguros Ágil</title>
          </Helmet>
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-center p-4">
            <ShieldAlert className="h-24 w-24 text-yellow-400 mb-6" />
            <h1 className="text-4xl font-bold mb-2">Acesso Negado</h1>
            <p className="text-lg text-gray-300 mb-8">Você não tem permissão para acessar esta página.</p>
            <Button onClick={() => navigate(-1) || navigate('/')}>Voltar</Button>
          </div>
        </>
      );
    };
    
    export default UnauthorizedPage;