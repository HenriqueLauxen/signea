import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DollarSign, Users, Search, Download, CheckCircle2, XCircle, Clock, Loader2, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";

interface Inscricao {
  id: string;
  evento_id: string;
  usuario_email: string;
  status: 'confirmada' | 'cancelada' | 'pendente';
  created_at: string;
}

interface Evento {
  id: string;
  titulo: string;
  valor?: number;
  data_inicio: string;
  data_fim: string;
}

interface PagamentoInfo {
  inscricao: Inscricao;
  evento: Evento;
  valorPago: number;
}

export default function Pagamentos() {
  const toast = useToast();
  const [pagamentos, setPagamentos] = useState<PagamentoInfo[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState<string>('todos');
  const [statusSelecionado, setStatusSelecionado] = useState<string>('todos');

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.email) {
        modal.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      // Buscar eventos pagos do organizador
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, titulo, valor, data_inicio, data_fim')
        .eq('organizador_email', session.user.email)
        .gt('valor', 0)
        .order('data_inicio', { ascending: false });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        modal.error(`Erro ao carregar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      setEventos(eventosData || []);

      if (!eventosData || eventosData.length === 0) {
        toast.info('Você não tem eventos pagos cadastrados');
        setPagamentos([]);
        setLoading(false);
        return;
      }

      // Buscar inscrições dos eventos pagos
      const eventosIds = eventosData.map(e => e.id);
      
      const { data: inscricoesData, error: inscricoesError } = await supabase
        .from('inscricoes')
        .select('*')
        .in('evento_id', eventosIds)
        .order('created_at', { ascending: false });

      if (inscricoesError) {
        console.error('Erro ao buscar inscrições:', inscricoesError);
        modal.error(`Erro ao carregar inscrições: ${inscricoesError.message}`);
        setLoading(false);
        return;
      }

      // Combinar inscrições com eventos
      const pagamentosInfo: PagamentoInfo[] = (inscricoesData || []).map(inscricao => {
        const evento = eventosData.find(e => e.id === inscricao.evento_id);
        return {
          inscricao,
          evento: evento!,
          valorPago: inscricao.status === 'confirmada' ? (evento?.valor || 0) : 0
        };
      });

      setPagamentos(pagamentosInfo);
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

  const filtrarPagamentos = () => {
    return pagamentos.filter(pag => {
      const matchBusca = !busca || 
        pag.inscricao.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
        pag.evento.titulo.toLowerCase().includes(busca.toLowerCase());
      
      const matchEvento = eventoSelecionado === 'todos' || pag.evento.id === eventoSelecionado;
      const matchStatus = statusSelecionado === 'todos' || pag.inscricao.status === statusSelecionado;
      
      return matchBusca && matchEvento && matchStatus;
    });
  };

  const exportarCSV = () => {
    const pagamentosFiltrados = filtrarPagamentos();
    
    const csv = [
      ['Evento', 'Participante', 'Email', 'Valor', 'Status', 'Data'].join(','),
      ...pagamentosFiltrados.map(p => [
        p.evento.titulo,
        p.inscricao.usuario_email,
        p.inscricao.usuario_email,
        `R$ ${(p.evento.valor || 0).toFixed(2)}`,
        p.inscricao.status,
        format(new Date(p.inscricao.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagamentos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    modal.success('CSV exportado com sucesso!');
  };

  const pagamentosFiltrados = filtrarPagamentos();
  const totalRecebido = pagamentosFiltrados
    .filter(p => p.inscricao.status === 'confirmada')
    .reduce((acc, p) => acc + p.valorPago, 0);
  const totalPendente = pagamentosFiltrados
    .filter(p => p.inscricao.status === 'pendente')
    .reduce((acc, p) => acc + (p.evento.valor || 0), 0);
  const pagamentosConfirmados = pagamentosFiltrados.filter(p => p.inscricao.status === 'confirmada').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">Gerencie os pagamentos das inscrições</p>
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
        <h1 className="text-3xl font-light tracking-tight">Pagamentos</h1>
        <p className="text-muted-foreground">Gerencie os pagamentos das inscrições</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Recebido</p>
              <p className="text-2xl font-normal">R$ {totalRecebido.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-500/10 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pendente</p>
              <p className="text-2xl font-normal">R$ {totalPendente.toFixed(2)}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pagamentos Confirmados</p>
              <p className="text-2xl font-normal">{pagamentosConfirmados}</p>
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
                placeholder="Buscar por evento ou participante..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
            <SelectTrigger className="w-full md:w-[200px]">
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
          <Select value={statusSelecionado} onValueChange={setStatusSelecionado}>
            <SelectTrigger className="w-full md:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="confirmada">Confirmado</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="cancelada">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={exportarCSV}
            disabled={pagamentosFiltrados.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Lista de Pagamentos */}
      {pagamentosFiltrados.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum pagamento encontrado</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {pagamentosFiltrados.map((pag) => (
            <Card key={pag.inscricao.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-normal">{pag.evento.titulo}</h3>
                    <Badge
                      variant={
                        pag.inscricao.status === 'confirmada'
                          ? 'default'
                          : pag.inscricao.status === 'pendente'
                          ? 'outline'
                          : 'destructive'
                      }
                      className="gap-1"
                    >
                      {pag.inscricao.status === 'confirmada' ? (
                        <><CheckCircle2 className="w-3 h-3" /> Confirmado</>
                      ) : pag.inscricao.status === 'pendente' ? (
                        <><Clock className="w-3 h-3" /> Pendente</>
                      ) : (
                        <><XCircle className="w-3 h-3" /> Cancelado</>
                      )}
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {pag.inscricao.usuario_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <DollarSign className="w-3 h-3" />
                      R$ {(pag.evento.valor || 0).toFixed(2)}
                    </span>
                    <span>
                      {format(new Date(pag.inscricao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
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
