import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'backend_url';
const DEFAULT_URL = 'http://localhost:3010';

export interface BackendStatus {
  connected: boolean;
  lastCheck: Date | null;
  error: string | null;
}

// ============ STORE GLOBAL ============
// Esto permite que todos los componentes compartan el mismo estado

let globalBackendUrl = localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
let globalStatus: BackendStatus = {
  connected: true,
  lastCheck: null,
  error: null,
};
let consecutiveFails = 0;
let listeners: Set<() => void> = new Set();
let checkIntervalId: ReturnType<typeof setInterval> | null = null;

// Snapshot cacheado - solo se actualiza cuando los valores cambian
let cachedSnapshot = { backendUrl: globalBackendUrl, status: globalStatus };

function notifyListeners() {
  // Crear nuevo snapshot solo cuando hay cambios
  cachedSnapshot = { backendUrl: globalBackendUrl, status: globalStatus };
  listeners.forEach(listener => listener());
}

function getSnapshot() {
  // Devolver siempre el mismo objeto hasta que cambie
  return cachedSnapshot;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  
  // Iniciar el polling cuando hay al menos un listener
  if (listeners.size === 1 && !checkIntervalId) {
    checkConnectionGlobal();
    checkIntervalId = setInterval(checkConnectionGlobal, 5000); // Cada 5 segundos
  }
  
  return () => {
    listeners.delete(listener);
    // Detener polling cuando no hay listeners
    if (listeners.size === 0 && checkIntervalId) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }
  };
}

async function checkConnectionGlobal() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const response = await fetch(`${globalBackendUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      consecutiveFails = 0;
      globalStatus = {
        connected: true,
        lastCheck: new Date(),
        error: null,
      };
    } else {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (err) {
    consecutiveFails++;
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido';
    
    globalStatus = {
      connected: false,
      lastCheck: new Date(),
      error: errorMsg.includes('abort') ? 'Timeout' : errorMsg,
    };
  }
  
  notifyListeners();
}

function setBackendUrlGlobal(url: string) {
  const normalizedUrl = url.replace(/\/$/, '');
  localStorage.setItem(STORAGE_KEY, normalizedUrl);
  globalBackendUrl = normalizedUrl;
  globalStatus = { connected: true, lastCheck: null, error: null };
  consecutiveFails = 0;
  notifyListeners();
  // Verificar conexión inmediatamente
  setTimeout(checkConnectionGlobal, 100);
}

// ============ HOOK ============

export function useBackendConfig() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot);
  
  return {
    backendUrl: snapshot.backendUrl,
    setBackendUrl: setBackendUrlGlobal,
    status: snapshot.status,
    showDisconnected: !snapshot.status.connected && consecutiveFails >= 2,
    checkConnection: checkConnectionGlobal,
  };
}

// ============ EXPORT PARA API CLIENT ============

export function getBackendUrl(): string {
  return globalBackendUrl;
}
