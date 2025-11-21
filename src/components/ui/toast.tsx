import * as React from "react";
import { X, CheckCircle, XCircle, Info, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
  warning: AlertCircle,
};

const styles = {
  success: "border-green-500/20 bg-green-500/10",
  error: "border-red-500/20 bg-red-500/10",
  info: "border-blue-500/20 bg-blue-500/10",
  warning: "border-yellow-500/20 bg-yellow-500/10",
};

export function ToastComponent({ toast, onClose }: ToastProps) {
  const Icon = icons[toast.type];

  React.useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.id, toast.duration, onClose]);

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl",
        "bg-background/95 border-border/10",
        "animate-in slide-in-from-top-2 fade-in-0",
        styles[toast.type]
      )}
      style={{ minWidth: "300px", maxWidth: "400px" }}
    >
      <Icon
        className={cn(
          "h-5 w-5 shrink-0",
          toast.type === "success" && "text-green-400",
          toast.type === "error" && "text-red-400",
          toast.type === "info" && "text-blue-400",
          toast.type === "warning" && "text-yellow-400"
        )}
      />
      <p className="flex-1 text-sm font-light text-foreground leading-relaxed">
        {toast.message}
      </p>
      <button
        onClick={() => onClose(toast.id)}
        className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/20"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

