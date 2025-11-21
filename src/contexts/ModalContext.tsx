import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ModalConfig {
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  onClose?: () => void;
}

interface ModalContextType {
  showModal: (config: ModalConfig) => void;
  hideModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export function ModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<ModalConfig>({
    title: '',
    message: '',
    type: 'info',
  });

  const showModal = useCallback((newConfig: ModalConfig) => {
    setConfig(newConfig);
    setIsOpen(true);
  }, []);

  const hideModal = useCallback(() => {
    setIsOpen(false);
    if (config.onClose) {
      config.onClose();
    }
  }, [config]);

  const getTitleByType = (type?: string) => {
    if (config.title) return config.title;
    
    switch (type) {
      case 'success':
        return 'Sucesso';
      case 'error':
        return 'Erro';
      case 'warning':
        return 'Atenção';
      case 'info':
      default:
        return 'Informação';
    }
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      
      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{getTitleByType(config.type)}</AlertDialogTitle>
          </AlertDialogHeader>

          <AlertDialogDescription className="whitespace-pre-line py-3">
            {config.message}
          </AlertDialogDescription>

          <AlertDialogFooter>
            <AlertDialogAction onClick={hideModal} className="w-full">OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ModalContext.Provider>
  );
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
}

// Helper functions to mimic toast API
export const modal = {
  success: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('showModal', {
        detail: { message, title, type: 'success' },
      });
      window.dispatchEvent(event);
    }
  },
  error: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('showModal', {
        detail: { message, title, type: 'error' },
      });
      window.dispatchEvent(event);
    }
  },
  info: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('showModal', {
        detail: { message, title, type: 'info' },
      });
      window.dispatchEvent(event);
    }
  },
  warning: (message: string, title?: string) => {
    if (typeof window !== 'undefined') {
      const event = new CustomEvent('showModal', {
        detail: { message, title, type: 'warning' },
      });
      window.dispatchEvent(event);
    }
  },
};

// Component to listen to modal events
export function ModalListener() {
  const { showModal } = useModal();

  React.useEffect(() => {
    const handleModalEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { message, title, type } = customEvent.detail;
      showModal({ message, title, type });
    };

    window.addEventListener('showModal', handleModalEvent);
    return () => window.removeEventListener('showModal', handleModalEvent);
  }, [showModal]);

  return null;
}

