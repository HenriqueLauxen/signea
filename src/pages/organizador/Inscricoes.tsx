import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Users, Search, Download, CheckCircle2, XCircle, Clock, Mail, User } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Inscricao {
  id: string;
  evento_id: string;
  usuario_email: string;
  status: 'confirmada' | 'cancelada' | 'pendente';
  created_at: string;
  eventos: {
    titulo: string;
    data_inicio: string;
    data_fim: string;
    local: string;
    valor?: number;
    tipo: string;
    organizador_email: string;
  };
  usuario_nome?: string;
}

export default function Inscricoes() {
  const toast = useToast();
  const [inscricoes, setInscricoes] = useState<Inscricao[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [filtroEvento, setFiltroEvento] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [eventos, setEventos] = useState<Array<{ id: string; titulo: string }>>([]);
  const [inscricaoParaCancelar, setInscricaoParaCancelar] = useState<string | null>(null);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('Erro ao obter sessão:', sessionError);
        modal.error('Erro ao obter sessão');
        setLoading(false);
        return;
      }

      if (!session?.user?.email) {
        modal.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      console.log('Email do organizador:', session.user.email);

      // Buscar eventos do organizador
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, titulo')
        .eq('organizador_email', session.user.email)
        .order('titulo');

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        modal.error(`Erro ao carregar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      console.log('Eventos encontrados:', eventosData?.length || 0);
      setEventos(eventosData || []);

      if (!eventosData || eventosData.length === 0) {
        setInscricoes([]);
        setLoading(false);
        return;
      }

      // Buscar inscrições dos eventos do organizador
      const eventosIds = eventosData.map(e => e.id);
      
      const { data: inscricoesData, error: inscricoesError } = await supabase
        .from('inscricoes')
        .select(`
          id,
          evento_id,
          usuario_email,
          status,
          created_at
        `)
        .in('evento_id', eventosIds)
        .order('created_at', { ascending: false });

      if (inscricoesError) {
        console.error('Erro ao buscar inscrições:', inscricoesError);
        modal.error(`Erro ao carregar inscrições: ${inscricoesError.message}`);
        setLoading(false);
        return;
      }

      console.log('Inscrições encontradas:', inscricoesData?.length || 0);

      // Buscar detalhes dos eventos para cada inscrição
      const inscricoesComEventos = await Promise.all(
        (inscricoesData || []).map(async (inscricao) => {
          const { data: eventoData } = await supabase
            .from('eventos')
            .select('titulo, data_inicio, data_fim, local, valor, tipo, organizador_email')
            .eq('id', inscricao.evento_id)
            .single();

          return {
            ...inscricao,
            eventos: eventoData || {
              titulo: 'Evento não encontrado',
              data_inicio: new Date().toISOString(),
              data_fim: new Date().toISOString(),
              local: 'N/A',
              valor: 0,
              tipo: 'N/A',
              organizador_email: session.user.email
            }
          };
        })
      );

      setInscricoes(inscricoesComEventos as Inscricao[]);
    } catch (error: any) {
      console.error('Erro ao carregar inscrições:', error);
      modal.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }

  async function cancelarInscricao(inscricaoId: string) {
    try {
      const { error } = await supabase
        .from('inscricoes')
        .update({ status: 'cancelada' })
        .eq('id', inscricaoId);

      if (error) throw error;

      modal.success('Inscrição cancelada com sucesso');
      carregarDados();
    } catch (error) {
      console.error('Erro ao cancelar inscrição:', error);
      modal.error('Erro ao cancelar inscrição');
    } finally {
      setInscricaoParaCancelar(null);
    }
  }

  function exportarCSV() {
    const inscricoesFiltradas = filtrarInscricoes();
    
    const csv = [
      ['Evento', 'Email', 'Status', 'Data Inscrição', 'Valor'].join(','),
      ...inscricoesFiltradas.map(i => [
        i.eventos.titulo,
        i.usuario_email,
        i.status,
        format(new Date(i.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
        `R$ ${(i.eventos.valor || 0).toFixed(2)}`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `inscricoes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    
    modal.success('Relatório exportado com sucesso');
  }

  function filtrarInscricoes() {
    return inscricoes.filter(inscricao => {
      const matchBusca = busca === '' || 
      inscricao.eventos.titulo.toLowerCase().includes(busca.toLowerCase()) ||
      inscricao.usuario_email.toLowerCase().includes(busca.toLowerCase());      const matchEvento = filtroEvento === 'todos' || inscricao.evento_id === filtroEvento;
      const matchStatus = filtroStatus === 'todos' || inscricao.status === filtroStatus;
      
      return matchBusca && matchEvento && matchStatus;
    });
  }

  function getStatusBadge(status: string) {
    const badges = {
      confirmada: { color: 'bg-green-500/10 text-green-500 border-green-500/20', icon: CheckCircle2, label: 'Confirmada' },
      cancelada: { color: 'bg-red-500/10 text-red-500 border-red-500/20', icon: XCircle, label: 'Cancelada' },
      pendente: { color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20', icon: Clock, label: 'Pendente' }
    };
    
    const badge = badges[status as keyof typeof badges] || badges.pendente;
    const Icon = badge.icon;
    
    return (
      <Badge className={badge.color}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </Badge>
    );
  }

  const inscricoesFiltradas = filtrarInscricoes();
  const totalInscricoes = inscricoesFiltradas.length;
  const confirmadas = inscricoesFiltradas.filter(i => i.status === 'confirmada').length;
  const canceladas = inscricoesFiltradas.filter(i => i.status === 'cancelada').length;
  const pendentes = inscricoesFiltradas.filter(i => i.status === 'pendente').length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Inscrições</h1>
          <p className="text-muted-foreground">Gerencie as inscrições dos seus eventos</p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Inscrições</h1>
        <p className="text-muted-foreground">Gerencie as inscrições dos seus eventos</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInscricoes}</div>
            <p className="text-xs text-muted-foreground">inscrições</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{confirmadas}</div>
            <p className="text-xs text-muted-foreground">participantes confirmados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendentes}</div>
            <p className="text-xs text-muted-foreground">aguardando confirmação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Canceladas</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{canceladas}</div>
            <p className="text-xs text-muted-foreground">inscrições canceladas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Encontre inscrições específicas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por evento, nome ou email..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filtroEvento} onValueChange={setFiltroEvento}>
              <SelectTrigger>
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

            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="confirmada">Confirmada</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={exportarCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Inscrições */}
      {inscricoesFiltradas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhuma inscrição encontrada</h3>
            <p className="text-muted-foreground text-center">
              {busca || filtroEvento !== 'todos' || filtroStatus !== 'todos'
                ? 'Tente ajustar os filtros de busca'
                : 'Aguarde os participantes se inscreverem nos seus eventos'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {inscricoesFiltradas.map((inscricao) => (
            <Card key={inscricao.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{inscricao.eventos.titulo}</CardTitle>
                    <CardDescription className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(inscricao.eventos.data_inicio), "dd 'de' MMMM", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {inscricao.eventos.local}
                      </span>
                    </CardDescription>
                  </div>
                  {getStatusBadge(inscricao.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{inscricao.usuario_email}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <span>{inscricao.usuario_email}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Data da inscrição:</span>
                      <span className="ml-2 font-medium">
                        {format(new Date(inscricao.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted-foreground">Valor:</span>
                      <span className="ml-2 font-medium">
                        {inscricao.eventos.valor > 0 
                          ? `R$ ${inscricao.eventos.valor.toFixed(2)}`
                          : 'Gratuito'}
                      </span>
                    </div>
                  </div>
                </div>

                {inscricao.status === 'confirmada' && (
                  <div className="mt-4 flex justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setInscricaoParaCancelar(inscricao.id)}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Cancelar Inscrição
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmação de Cancelamento */}
      <AlertDialog open={!!inscricaoParaCancelar} onOpenChange={() => setInscricaoParaCancelar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Inscrição</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta inscrição? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => inscricaoParaCancelar && cancelarInscricao(inscricaoParaCancelar)}
              className="bg-red-500 hover:bg-red-600"
            >
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
