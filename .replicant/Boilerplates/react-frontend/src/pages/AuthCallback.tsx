import { useAuth0 } from '@auth0/auth0-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { SKIP_AUTH } from '@/config/skip-auth';

export default function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    if (SKIP_AUTH) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (SKIP_AUTH) return null;

  const { isLoading, error } = useAuth0();

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold text-destructive">Error de autenticación</h2>
          <p className="text-muted-foreground">{error.message}</p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
          >
            Volver al login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-lg font-medium text-muted-foreground">Procesando autenticación...</p>
        </div>
      </div>
    );
  }

  return null;
}
