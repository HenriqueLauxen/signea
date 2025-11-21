import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  BarChart3, 
  Users, 
  Calendar, 
  Award, 
  TrendingUp, 
  Download, 
  CheckCircle2, 
  XCircle,
  Clock,
  Loader2,
  FileText,
  DollarSign
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";

interface EventoRelatorio {
  id: string;
  titulo: string;
  tipo: string;
  data_inicio: string;
  data_fim: string;
  status: string;
  capacidade_maxima: number;
  vagas_disponiveis: number;
  carga_horaria: number;
  valor?: number;
  gera_certificado: boolean;
  totalInscritos: number;
  inscritosConfirmados: number;
  inscritosPendentes: number;
  inscritosCancelados: number;
  totalPresencas: number;
  participantesComPresenca: number;
  certificadosEmitidos: number;
  valorArrecadado: number;
}

export default function Relatorios() {
  const toast = useToast();
  const [eventos, setEventos] = useState<EventoRelatorio[]>([]);
  const [loading, setLoading] = useState(true);
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
        .select('*')
        .eq('organizador_email', session.user.email)
        .order('data_inicio', { ascending: false });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        modal.error(`Erro ao carregar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      if (!eventosData || eventosData.length === 0) {
        toast.info('Você ainda não criou nenhum evento');
        setEventos([]);
        setLoading(false);
        return;
      }

      // Para cada evento, buscar estatísticas detalhadas
      const eventosComRelatorio = await Promise.all(
        eventosData.map(async (evento) => {
          // Inscrições
          const { data: inscricoes } = await supabase
            .from('inscricoes')
            .select('status')
            .eq('evento_id', evento.id);

          const totalInscritos = inscricoes?.length || 0;
          const inscritosConfirmados = inscricoes?.filter(i => i.status === 'confirmada').length || 0;
          const inscritosPendentes = inscricoes?.filter(i => i.status === 'pendente').length || 0;
          const inscritosCancelados = inscricoes?.filter(i => i.status === 'cancelada').length || 0;

          // Presenças
          const { data: presencas } = await supabase
            .from('presencas')
            .select('usuario_email')
            .eq('evento_id', evento.id);

          const totalPresencas = presencas?.length || 0;
          const participantesComPresenca = [...new Set(presencas?.map(p => p.usuario_email))].length;

          // Certificados
          const { count: certificadosEmitidos } = await supabase
            .from('certificados')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id);

          // Valor arrecadado
          const valorArrecadado = (evento.valor || 0) * inscritosConfirmados;

          return {
            ...evento,
            totalInscritos,
            inscritosConfirmados,
            inscritosPendentes,
            inscritosCancelados,
            totalPresencas,
            participantesComPresenca,
            certificadosEmitidos: certificadosEmitidos || 0,
            valorArrecadado
          };
        })
      );

      setEventos(eventosComRelatorio);
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

  const eventosFiltrados = eventoSelecionado === 'todos' 
    ? eventos 
    : eventos.filter(e => e.id === eventoSelecionado);

  const totais = eventosFiltrados.reduce((acc, evento) => ({
    inscritos: acc.inscritos + evento.totalInscritos,
    presencas: acc.presencas + evento.totalPresencas,
    certificados: acc.certificados + evento.certificadosEmitidos,
    valorArrecadado: acc.valorArrecadado + evento.valorArrecadado
  }), { inscritos: 0, presencas: 0, certificados: 0, valorArrecadado: 0 });

  const exportarRelatorio = () => {
    const csv = [
      ['Evento', 'Tipo', 'Status', 'Data Início', 'Data Fim', 'Capacidade', 'Vagas Disponíveis', 'Inscritos', 'Confirmados', 'Pendentes', 'Cancelados', 'Total Presenças', 'Participantes c/ Presença', 'Certificados', 'Valor', 'Arrecadado'].join(','),
      ...eventosFiltrados.map(e => [
        e.titulo,
        e.tipo,
        e.status,
        format(new Date(e.data_inicio), 'dd/MM/yyyy', { locale: ptBR }),
        format(new Date(e.data_fim), 'dd/MM/yyyy', { locale: ptBR }),
        e.capacidade_maxima,
        e.vagas_disponiveis,
        e.totalInscritos,
        e.inscritosConfirmados,
        e.inscritosPendentes,
        e.inscritosCancelados,
        e.totalPresencas,
        e.participantesComPresenca,
        e.certificadosEmitidos,
        `R$ ${(e.valor || 0).toFixed(2)}`,
        `R$ ${e.valorArrecadado.toFixed(2)}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-eventos-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    modal.success('Relatório exportado com sucesso!');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Relatórios</h1>
          <p className="text-muted-foreground">Visualize relatórios detalhados dos seus eventos</p>
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
        <h1 className="text-3xl font-light tracking-tight">Relatórios</h1>
        <p className="text-muted-foreground">Visualize relatórios detalhados dos seus eventos</p>
      </div>

      {/* Filtros */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Filtrar por Evento</label>
            <Select value={eventoSelecionado} onValueChange={setEventoSelecionado}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um evento" />
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
          </div>
          <Button 
            variant="outline" 
            onClick={exportarRelatorio}
            disabled={eventosFiltrados.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar Relatório
          </Button>
        </div>
      </Card>

      {/* Cards de Resumo Geral */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Inscritos</p>
              <p className="text-2xl font-normal">{totais.inscritos}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Presenças</p>
              <p className="text-2xl font-normal">{totais.presencas}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Award className="w-6 h-6 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Certificados</p>
              <p className="text-2xl font-normal">{totais.certificados}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Arrecadado</p>
              <p className="text-2xl font-normal">R$ {totais.valorArrecadado.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Lista Detalhada de Eventos */}
      {eventosFiltrados.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum evento encontrado</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {eventosFiltrados.map((evento) => {
            const taxaOcupacao = ((evento.capacidade_maxima - evento.vagas_disponiveis) / evento.capacidade_maxima) * 100;
            const taxaComparecimento = evento.totalInscritos > 0 
              ? (evento.participantesComPresenca / evento.inscritosConfirmados) * 100 
              : 0;

            return (
              <Card key={evento.id} className="p-6">
                <div className="space-y-4">
                  {/* Cabeçalho */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-normal">{evento.titulo}</h3>
                        <Badge
                          variant={
                            evento.status === 'aprovado' ? 'default' :
                            evento.status === 'pendente' ? 'outline' :
                            evento.status === 'finalizado' ? 'secondary' :
                            'destructive'
                          }
                        >
                          {evento.status}
                        </Badge>
                        <Badge variant="outline">{evento.tipo}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(evento.data_inicio), 'dd/MM/yyyy', { locale: ptBR })} - {format(new Date(evento.data_fim), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {evento.carga_horaria}h
                        </span>
                        {evento.valor && evento.valor > 0 && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            R$ {evento.valor.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Estatísticas em Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Capacidade</p>
                      <p className="text-lg font-normal">{evento.capacidade_maxima}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Vagas Livres</p>
                      <p className="text-lg font-normal">{evento.vagas_disponiveis}</p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Inscritos</p>
                      <p className="text-lg font-normal text-blue-500">{evento.totalInscritos}</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Confirmados</p>
                      <p className="text-lg font-normal text-green-500">{evento.inscritosConfirmados}</p>
                    </div>
                    <div className="p-3 bg-yellow-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Pendentes</p>
                      <p className="text-lg font-normal text-yellow-600">{evento.inscritosPendentes}</p>
                    </div>
                    <div className="p-3 bg-red-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Cancelados</p>
                      <p className="text-lg font-normal text-red-500">{evento.inscritosCancelados}</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Presenças</p>
                      <p className="text-lg font-normal text-purple-500">{evento.totalPresencas}</p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Participantes</p>
                      <p className="text-lg font-normal text-indigo-500">{evento.participantesComPresenca}</p>
                    </div>
                    {evento.gera_certificado && (
                      <div className="p-3 bg-amber-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Certificados</p>
                        <p className="text-lg font-normal text-amber-600">{evento.certificadosEmitidos}</p>
                      </div>
                    )}
                    {evento.valor && evento.valor > 0 && (
                      <div className="p-3 bg-emerald-500/10 rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Arrecadado</p>
                        <p className="text-lg font-normal text-emerald-600">R$ {evento.valorArrecadado.toFixed(2)}</p>
                      </div>
                    )}
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Taxa Ocupação</p>
                      <p className="text-lg font-normal">{taxaOcupacao.toFixed(1)}%</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Comparecimento</p>
                      <p className="text-lg font-normal">{taxaComparecimento.toFixed(1)}%</p>
                    </div>
                  </div>

                  {/* Barras de Progresso */}
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Ocupação</span>
                        <span>{taxaOcupacao.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${taxaOcupacao}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Comparecimento</span>
                        <span>{taxaComparecimento.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${taxaComparecimento}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
