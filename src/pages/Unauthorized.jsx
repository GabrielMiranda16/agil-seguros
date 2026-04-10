import React from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const logoUrl = "https://storage.googleapis.com/hostinger-horizons-assets-prod/bcb47250-76a3-434c-9312-56a9dba14a6f/247eb5219c397bb2ed2bcac42f39a442.png";

const UnauthorizedPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>Acesso Negado - Seguros Ágil</title>
      </Helmet>
      <div className="min-h-screen bg-soft-gradient flex flex-col">
        <header style={{ background: 'transparent' }}>
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16 sm:h-24">
              <img src={logoUrl} alt="Ágil Seguros" className="h-10 sm:h-20 w-auto object-contain" />
            </div>
          </div>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center text-center px-4">
          <ShieldAlert className="h-20 w-20 text-yellow-300 mb-6 opacity-90" />
          <h1 className="text-3xl font-bold text-white mb-2">Acesso Negado</h1>
          <p className="text-white/70 text-base mb-8">Você não tem permissão para acessar esta página.</p>
          <Button
            onClick={() => navigate(-1)}
            className="bg-white text-[#003580] hover:bg-white/90 font-semibold"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </main>
      </div>
    </>
  );
};

export default UnauthorizedPage;
