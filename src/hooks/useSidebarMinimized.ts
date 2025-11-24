import { useState, useEffect } from "react";

const SIDEBAR_MINIMIZED_KEY = "sidebar_minimized";

/**
 * Hook compartilhado para gerenciar o estado de minimizado do sidebar
 * Persiste no localStorage para manter estado entre sessões e perfis
 */
export function useSidebarMinimized() {
  // Inicializa com valor do localStorage ou false por padrão
  const [minimizado, setMinimizadoState] = useState(() => {
    try {
      const stored = localStorage.getItem(SIDEBAR_MINIMIZED_KEY);
      return stored === "true";
    } catch {
      return false;
    }
  });

  // Atualiza localStorage sempre que o estado mudar
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_MINIMIZED_KEY, minimizado.toString());
    } catch (error) {
      console.error("Erro ao salvar estado do sidebar no localStorage:", error);
    }
  }, [minimizado]);

  const setMinimizado = (value: boolean | ((prev: boolean) => boolean)) => {
    setMinimizadoState((prev) => {
      const newValue = typeof value === "function" ? value(prev) : value;
      return newValue;
    });
  };

  const toggleMinimizado = () => {
    setMinimizado((prev) => !prev);
  };

  return {
    minimizado,
    setMinimizado,
    toggleMinimizado,
  };
}

