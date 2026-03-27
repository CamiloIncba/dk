import { useBackendConfig } from '../hooks/useBackendConfig';

interface ConnectionIndicatorProps {
  showUrl?: boolean;
  compact?: boolean;
}

export function ConnectionIndicator({ showUrl = false, compact = false }: ConnectionIndicatorProps) {
  const { status, backendUrl } = useBackendConfig();

  if (compact) {
    return (
      <div
        className={`w-3 h-3 rounded-full ${
          status.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        }`}
        title={status.connected ? 'Conectado al servidor' : 'Sin conexión al servidor'}
      />
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-2.5 h-2.5 rounded-full ${
          status.connected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
        }`}
      />
      <span className={status.connected ? 'text-green-700' : 'text-red-700'}>
        {status.connected ? 'Conectado' : 'Sin conexión'}
      </span>
      {showUrl && (
        <span className="text-gray-500 text-xs truncate max-w-32">
          ({backendUrl})
        </span>
      )}
    </div>
  );
}
