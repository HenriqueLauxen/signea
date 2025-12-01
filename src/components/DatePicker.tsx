import { useState, useEffect, useRef } from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: boolean;
  fromYear?: number;
  toYear?: number;
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Selecione uma data",
  disabled = false,
  fromYear = 1940,
  toYear = new Date().getFullYear() + 100,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState(
    date ? format(date, "dd/MM/yyyy", { locale: ptBR }) : ""
  );

  const formatDateInput = (value: string): string => {
    // Remove tudo que não é número
    const numbers = value.replace(/\D/g, "");
    
    // Limita a 8 dígitos (ddMMyyyy)
    const limited = numbers.slice(0, 8);
    
    // Adiciona as barras automaticamente
    if (limited.length <= 2) {
      return limited;
    } else if (limited.length <= 4) {
      return `${limited.slice(0, 2)}/${limited.slice(2)}`;
    } else {
      return `${limited.slice(0, 2)}/${limited.slice(2, 4)}/${limited.slice(4)}`;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const formatted = formatDateInput(value);
    setInputValue(formatted);

    // Tentar parsear a data no formato dd/MM/yyyy
    if (formatted.length === 10) {
      const parsedDate = parse(formatted, "dd/MM/yyyy", new Date(), { locale: ptBR });
      
      if (isValid(parsedDate)) {
        onDateChange(parsedDate);
      }
    } else if (formatted === "") {
      onDateChange(undefined);
    }
  };


  // Atualizar input quando a data mudar externamente
  useEffect(() => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy", { locale: ptBR }));
    } else {
      setInputValue("");
    }
  }, [date]);

  const inputRef = useRef<HTMLInputElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  const handleInputFocus = () => {
    isInteractingRef.current = true;
    setIsOpen(true);
  };

  const handleInputClick = () => {
    isInteractingRef.current = true;
    if (inputRef.current) {
      inputRef.current.focus();
    }
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    // Verificar se o foco está indo para o popover
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (relatedTarget && (popoverContentRef.current?.contains(relatedTarget) || relatedTarget.closest('[role="dialog"]'))) {
      isInteractingRef.current = true;
      return; // Não fechar se o foco for para o popover
    }
    
    // Verificar após um pequeno delay se o foco realmente saiu
    setTimeout(() => {
      const activeElement = document.activeElement;
      if (
        activeElement !== inputRef.current &&
        !popoverContentRef.current?.contains(activeElement) &&
        !activeElement?.closest('[role="dialog"]')
      ) {
        isInteractingRef.current = false;
        setIsOpen(false);
        // Restaurar valor se necessário
        if (inputValue && date) {
          setInputValue(format(date, "dd/MM/yyyy", { locale: ptBR }));
        } else if (!inputValue) {
          setInputValue("");
        }
      } else {
        isInteractingRef.current = true;
      }
    }, 200);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <div className="relative flex w-full">
        <PopoverAnchor asChild>
          <div className="w-full">
            <Input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onClick={handleInputClick}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              disabled={disabled}
              maxLength={10}
              className={cn(
                "h-12 bg-transparent border-border focus:glow-border-hover pr-10",
                !date && "text-muted-foreground"
              )}
            />
          </div>
        </PopoverAnchor>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          onClick={() => {
            isInteractingRef.current = true;
            setIsOpen(!isOpen);
          }}
          type="button"
          className="absolute right-0 h-12 w-10 hover:bg-transparent pointer-events-auto"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <PopoverContent 
        ref={popoverContentRef}
        className="w-auto p-0 bg-card border-border" 
        align="start" 
        side="bottom" 
        sideOffset={4}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onInteractOutside={(e) => {
          if (inputRef.current?.contains(e.target as Node)) {
            e.preventDefault();
            return;
          }
          isInteractingRef.current = false;
        }}
      >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(selectedDate) => {
              onDateChange(selectedDate);
              if (selectedDate) {
                setInputValue(format(selectedDate, "dd/MM/yyyy", { locale: ptBR }));
              }
              // Não fechar o picker, permitir continuar usando
            }}
            disabled={false}
            initialFocus
            fromYear={fromYear}
            toYear={toYear}
            className="rounded-md"
          />
        </PopoverContent>
    </Popover>
  );
}

