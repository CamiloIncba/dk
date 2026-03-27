import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <div className="text-6xl font-bold text-muted-foreground">404</div>
        <h2 className="text-xl font-bold">Página no encontrada</h2>
        <p className="text-muted-foreground">La página que buscas no existe.</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium"
        >
          Ir al inicio
        </button>
      </div>
    </div>
  );
}
