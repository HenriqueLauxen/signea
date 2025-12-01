import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Award, Users, Search, Download, CheckCircle2, Clock, Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
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

interface Certificado {
  id: string;
  evento_id: string;
  usuario_email: string;
  usuario_nome: string;
  codigo_validacao: string;
  hash_sha256?: string | null;
  url_pdf: string | null;
  data_emissao: string;
}

interface Evento {
  id: string;
  titulo: string;
  data_inicio: string;
  data_fim: string;
  carga_horaria: number;
  gera_certificado: boolean;
}

interface EventoComStats extends Evento {
  totalInscritos: number;
  totalPresencas: number;
  certificadosEmitidos: number;
}

export default function Certificados() {
  const toast = useToast();
  const [eventos, setEventos] = useState<EventoComStats[]>([]);
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [eventoSelecionado, setEventoSelecionado] = useState<string>('todos');
  const [emitindoCertificados, setEmitindoCertificados] = useState(false);
  const [eventoParaEmitir, setEventoParaEmitir] = useState<string | null>(null);

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.email) {
        toast.error('Você precisa estar logado');
        setLoading(false);
        return;
      }

      // Buscar eventos que geram certificado (todos os organizadores podem ver todos os eventos)
      const { data: eventosData, error: eventosError } = await supabase
        .from('eventos')
        .select('id, titulo, data_inicio, data_fim, carga_horaria, gera_certificado')
        .eq('gera_certificado', true)
        .eq('status', 'finalizado')
        .order('data_inicio', { ascending: false });

      if (eventosError) {
        console.error('Erro ao buscar eventos:', eventosError);
        toast.error(`Erro ao carregar eventos: ${eventosError.message}`);
        setLoading(false);
        return;
      }

      // Para cada evento, buscar estatísticas
      const eventosComStats = await Promise.all(
        (eventosData || []).map(async (evento) => {
          // Total de inscritos
          const { count: inscritos } = await supabase
            .from('inscricoes')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id)
            .eq('status', 'confirmada');

          // Total de presenças únicas
          const { data: presencas } = await supabase
            .from('presencas')
            .select('usuario_email')
            .eq('evento_id', evento.id);

          const presencasUnicas = [...new Set(presencas?.map(p => p.usuario_email))].length;

          // Certificados emitidos
          const { count: certificadosEmitidos } = await supabase
            .from('certificados')
            .select('*', { count: 'exact', head: true })
            .eq('evento_id', evento.id);

          return {
            ...evento,
            totalInscritos: inscritos || 0,
            totalPresencas: presencasUnicas,
            certificadosEmitidos: certificadosEmitidos || 0
          };
        })
      );

      setEventos(eventosComStats);

      // Buscar todos os certificados
      const eventosIds = eventosComStats.map(e => e.id);
      
      if (eventosIds.length > 0) {
        const { data: certificadosData, error: certificadosError } = await supabase
          .from('certificados')
          .select('*')
          .in('evento_id', eventosIds)
          .order('data_emissao', { ascending: false });

        if (certificadosError) {
          console.error('Erro ao buscar certificados:', certificadosError);
        } else {
          setCertificados(certificadosData || []);
        }
      }
    } catch (error: any) {
      console.error('Erro ao carregar dados:', error);
      toast.error(`Erro: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const emitirCertificados = async (eventoId: string) => {
    try {
      setEmitindoCertificados(true);

      // Buscar usuários com presença >= 75%
      const { data: presencas } = await supabase
        .from('presencas')
        .select('usuario_email, usuario_nome')
        .eq('evento_id', eventoId);

      if (!presencas || presencas.length === 0) {
        toast.error('Nenhuma presença registrada para este evento');
        return;
      }

      // Contar presenças por usuário
      const presencasPorUsuario = presencas.reduce((acc, p) => {
        acc[p.usuario_email] = (acc[p.usuario_email] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Calcular total de dias do evento
      const evento = eventos.find(e => e.id === eventoId);
      const totalDias = Math.ceil(
        (new Date(evento!.data_fim).getTime() - new Date(evento!.data_inicio).getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      // Filtrar usuários elegíveis (>= 75% presença)
      const usuariosElegiveis = Object.entries(presencasPorUsuario)
        .filter(([_, count]) => (count / totalDias) >= 0.75)
        .map(([email]) => email);

      if (usuariosElegiveis.length === 0) {
        toast.error('Nenhum participante atingiu 75% de presença');
        return;
      }

      // Emitir certificados
      const certificadosParaEmitir = usuariosElegiveis.map(email => {
        const presencaUsuario = presencas.find(p => p.usuario_email === email);
        return {
          evento_id: eventoId,
          usuario_email: email,
          usuario_nome: presencaUsuario?.usuario_nome || email,
          codigo_validacao: `CERT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`.toUpperCase(),
          data_emissao: new Date().toISOString()
        };
      });

      const { error } = await supabase
        .from('certificados')
        .upsert(certificadosParaEmitir, { 
          onConflict: 'evento_id,usuario_email',
          ignoreDuplicates: false 
        });

      if (error) throw error;

      toast.success(`${usuariosElegiveis.length} certificados emitidos com sucesso!`);
      carregarDados();
    } catch (error: any) {
      console.error('Erro ao emitir certificados:', error);
      toast.error(`Erro ao emitir certificados: ${error.message}`);
    } finally {
      setEmitindoCertificados(false);
      setEventoParaEmitir(null);
    }
  };

  const filtrarCertificados = () => {
    return certificados.filter(cert => {
      const matchBusca = !busca || 
        cert.usuario_email.toLowerCase().includes(busca.toLowerCase()) ||
        cert.usuario_nome?.toLowerCase().includes(busca.toLowerCase()) ||
        cert.codigo_validacao.toLowerCase().includes(busca.toLowerCase());
      
      const matchEvento = eventoSelecionado === 'todos' || cert.evento_id === eventoSelecionado;
      
      return matchBusca && matchEvento;
    });
  };

  const exportarCSV = () => {
    const certificadosFiltrados = filtrarCertificados();
    
    const csv = [
      ['Evento', 'Participante', 'Email', 'Código Validação', 'Data Emissão'].join(','),
      ...certificadosFiltrados.map(c => {
        const evento = eventos.find(e => e.id === c.evento_id);
        return [
          evento?.titulo || 'N/A',
          c.usuario_nome || 'N/A',
          c.usuario_email,
          c.codigo_validacao,
          format(new Date(c.data_emissao), 'dd/MM/yyyy HH:mm', { locale: ptBR })
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `certificados-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exportado com sucesso!');
  };

  const getEventoNome = (eventoId: string) => {
    return eventos.find(e => e.id === eventoId)?.titulo || 'Evento não encontrado';
  };

  const certificadosFiltrados = filtrarCertificados();
  const totalCertificados = certificadosFiltrados.length;
  const eventosComCertificados = [...new Set(certificadosFiltrados.map(c => c.evento_id))].length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Certificados</h1>
          <p className="text-muted-foreground">Gerencie a emissão de certificados</p>
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
        <h1 className="text-3xl font-light tracking-tight">Certificados</h1>
        <p className="text-muted-foreground">Gerencie a emissão de certificados</p>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Award className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total de Certificados</p>
              <p className="text-2xl font-normal">{totalCertificados}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-500/10 rounded-lg">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Eventos com Certificados</p>
              <p className="text-2xl font-normal">{eventosComCertificados}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Eventos Finalizados</p>
              <p className="text-2xl font-normal">{eventos.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Eventos para Emitir Certificados */}
      {eventos.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-normal">Eventos Finalizados</h2>
          <div className="grid gap-4">
            {eventos.map((evento) => (
              <Card key={evento.id} className="p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-normal mb-2">{evento.titulo}</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span>{evento.carga_horaria}h</span>
                      <span>•</span>
                      <span>{evento.totalInscritos} inscritos</span>
                      <span>•</span>
                      <span>{evento.totalPresencas} com presença</span>
                      <span>•</span>
                      <span className="text-primary">{evento.certificadosEmitidos} certificados emitidos</span>
                    </div>
                  </div>
                  <Button
                    variant="elegant"
                    onClick={() => setEventoParaEmitir(evento.id)}
                    disabled={emitindoCertificados}
                  >
                    <Award className="w-4 h-4 mr-2" />
                    {evento.certificadosEmitidos > 0 ? 'Reemitir' : 'Emitir'} Certificados
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <Card className="p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por participante, email ou código..."
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
            disabled={certificadosFiltrados.length === 0}
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </Card>

      {/* Lista de Certificados */}
      {certificadosFiltrados.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Award className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Nenhum certificado emitido ainda</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {certificadosFiltrados.map((cert) => (
            <Card key={cert.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-normal">{getEventoNome(cert.evento_id)}</h3>
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Emitido
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {cert.usuario_nome || cert.usuario_email}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {cert.codigo_validacao}
                    </span>
                    <span>
                      {format(new Date(cert.data_emissao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="elegant"
                    size="sm"
                    onClick={() => {
                      const hash = cert.hash_sha256 || cert.codigo_validacao;
                      if (hash) {
                        const url = `/certificado/${hash}`;
                        window.open(url, '_blank');
                      } else {
                        toast.error('Hash do certificado não disponível');
                      }
                    }}
                  >
                    Imprimir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de Confirmação */}
      <AlertDialog open={eventoParaEmitir !== null} onOpenChange={() => setEventoParaEmitir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Emitir Certificados</AlertDialogTitle>
            <AlertDialogDescription>
              Certificados serão emitidos para todos os participantes com pelo menos 75% de presença.
              Esta ação pode sobrescrever certificados já emitidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => eventoParaEmitir && emitirCertificados(eventoParaEmitir)}
              disabled={emitindoCertificados}
            >
              {emitindoCertificados ? 'Emitindo...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

