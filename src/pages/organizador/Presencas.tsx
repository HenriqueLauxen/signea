import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Users, Search, Download, CheckCircle2, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";

interface Presenca {
  id: string;
  evento_id: string;
  usuario_email: string;
  usuario_nome: string;
  data_presenca: string;
  dia_evento: number | null;
  validado_por: string | null;
  created_at: string;
}

interface Evento {
  id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
}

export default function Presencas() {
  const toast = useToast();
  const [presencas, setPresencas] = useState<Presenca[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState<string>('todos');

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.email) {
        modal.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      // Buscar eventos do organizador
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, data_fim')
        .eq('organizador_email', session.user.email)
        .order('data_inicio', { ascending: false });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        modal.error(`Erro ao carregar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      setEventos(eventosData || []);

      if (!eventosData || eventosData.length === 0) {
        setPresencas([]);
        setLoading(false);
        return;
      }

      // Buscar presenças dos eventos do organizador
      const eventosIds = eventosData.map(e => e.id);
      
      const { data: presencasData, error: presencasError } = await supabase
        .from('presencas')
        .select('*')
        .in('evento_id', eventosIds)
        .order('data_presenca', { ascending: false });

      if (presencasError) {
        console.error('Erro ao buscar presenças:', presencasError);
        modal.error(`Erro ao carregar presenças: ${presencasError.message}`);
        setLoading(false);
        return;
      }

      setPresencas(presencasData || []);
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      modal.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const filtrarPresencas = () => {
    return presencas.filter(presenca => {
      const matchBusca = !busca || 
        presenca.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
        presenca.usuario_nome?.toLowerCase().includes(busca.toLowerCase());
      
      const matchEvento = eventoSelecionado === 'todos' || presenca.evento_id === eventoSelecionado;
      
      return matchBusca && matchEvento;
    });
  };

  const exportarCSV = () => {
    const presencasFiltradas = filtrarPresencas();
    
    const csv = [
      ['Evento', 'Participante', 'Email', 'Data/Hora', 'Dia', 'Validado Por'].join(','),
      ...presencasFiltradas.map(p => {
        const evento = eventos.find(e => e.id === p.evento_id);
        return [
          evento?.titulo || 'N/A',
          p.usuario_nome || 'N/A',
          p.usuario_email,
          format(new Date(p.data_presenca), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
          p.dia_evento || 'N/A',
          p.validado_por || 'Auto'
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `presencas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    modal.success('CSV exportado com sucesso!');
  };

  const getEventoNome = (eventoId: string) => {
    return eventos.find(e => e.id === eventoId)?.titulo || 'Evento não encontrado';
  };

  const presencasFiltradas = filtrarPresencas();
  const totalPresencas = presencasFiltradas.length;
  const presencasHoje = presencasFiltradas.filter(p => {
    const hoje = new Date();
    const dataPresenca = new Date(p.data_presenca);
    return dataPresenca.toDateString() === hoje.toDateString();
  }).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Presenças</h1>
          <p className="text-muted-foreground">Acompanhe as presenças dos participantes</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Presenças</h1>
        <p className="text-muted-foreground">Acompanhe as presenças dos participantes</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Presenças</p>
              <p className="text-2xl font-normal">{totalPresencas}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Presenças Hoje</p>
              <p className="text-2xl font-normal">{presencasHoje}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Eventos com Presenças</p>
              <p className="text-2xl font-normal">
                {[...new Set(presencas.map(p => p.evento_id))].length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por participante ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
            <SelectTrigger className="w-full md:w-[250px]">
              <SelectValue placeholder="Filtrar por evento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os eventos</SelectItem>
              {eventos.map(evento => (
                <SelectItem key={evento.id} value={evento.id}>
                  {evento.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={exportarCSV}
            disabled={presencasFiltradas.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Lista de Presenças */}
      {presencasFiltradas.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhuma presença registrada</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {presencasFiltradas.map((presenca) => (
            <Card key={presenca.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-normal">{getEventoNome(presenca.evento_id)}</h3>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Confirmada
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {presenca.usuario_nome || presenca.usuario_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(presenca.data_presenca), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                    {presenca.dia_evento && (
                      <span>Dia {presenca.dia_evento}</span>
                    )}
                    {presenca.validado_por && (
                      <span className="text-xs">Validado por: {presenca.validado_por}</span>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
