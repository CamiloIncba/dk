import { useAuth0 } from '@auth0/auth0-react';
import { Loader2 } from 'lucide-react';
import { SKIP_AUTH } from '@/config/skip-auth';
import { Navigate } from 'react-router-dom';

export default function Login() {
  if (SKIP_AUTH) {
    return <Navigate to="/" replace />;
  }

  const { loginWithRedirect, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">{{PROYECTO}}</h1>
          <p className="text-muted-foreground">{{DESCRIPCION_CORTA}}</p>
        </div>
        <button
          onClick={() => loginWithRedirect()}
          className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Iniciar Sesión
        </button>
      </div>
    </div>
  );
}
