import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import type { HealthResponse } from '../types';

export function useBackendHealth(pollInterval = 10000) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const check = useCallback(async () => {
    try {
      const data = await apiService.getHealth();
      setHealth(data);
      setConnected(true);
    } catch {
      setHealth(null);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, pollInterval);
    return () => clearInterval(id);
  }, [check, pollInterval]);

  return { health, connected, loading, refresh: check };
}
