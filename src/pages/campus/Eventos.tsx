import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, Clock, MapPin, Loader2, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Evento {
  id: string;
  titulo: string;
  descricao: string;
  data_inicio: string;
  data_fim: string;
  local: string;
  status: string;
  banner_url: string | null;
  carga_horaria: number | null;
  capacidade_maxima: number;
  vagas_disponiveis: number;
  tipo: string;
  valor: number;
  created_at: string;
}

export default function Eventos() {
  const navigate = useNavigate();
  const toast = useToast();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const carregarEventos = async () => {
    try {
      setLoading(true);

      // Buscar TODOS os eventos
      const { data, error } = await supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        const msg = `${(error as any)?.message || ''} ${(error as any)?.details || ''}`.toLowerCase();
        if (msg.includes('permission') || msg.includes('security')) {
          toast.info('Sem permissão para visualizar eventos');
          setEventos([]);
          return;
        }
        // Fallback: tentar carregar colunas básicas
        const { data: basicData, error: basicError } = await supabase
          .from('eventos')
          .select('id, titulo, descricao, status, banner_url, created_at')
          .order('created_at', { ascending: false });
        if (basicError) throw basicError;
        setEventos(basicData || []);
        return;
      }

      setEventos(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      const msg = `${(error as any)?.message || ''} ${(error as any)?.details || ''}`.trim();
      toast.error(msg ? `Erro ao carregar eventos: ${msg}` : 'Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEventos();

    // Real-time subscription
    const channel = supabase
      .channel('campus-eventos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'eventos'
        },
        () => {
          carregarEventos();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Aprovado</Badge>;
      case 'pendente':
        return <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/20">Pendente</Badge>;
      case 'rejeitado':
        return <Badge className="bg-red-500/10 text-red-500 border-red-500/20">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getVagasInfo = (evento: Evento) => {
    const ocupadas = evento.capacidade_maxima - evento.vagas_disponiveis;
    const percentual = Math.round((ocupadas / evento.capacidade_maxima) * 100);
    return { ocupadas, percentual };
  };

  const filteredEvents = eventos.filter(evento =>
    evento.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evento.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evento.local?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Eventos do Campus</h1>
          <Button onClick={() => navigate("/organizador/criar-evento")}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Evento
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Eventos do Campus</h1>
          <p className="text-muted-foreground">Gerencie todos os eventos do campus</p>
        </div>
        <Button onClick={() => navigate("/organizador/criar-evento")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar eventos..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-sm"
        />
      </div>

      {filteredEvents.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground space-y-4">
            <Calendar className="w-12 h-12 mx-auto opacity-50" />
            <div>
              <p className="text-lg">Nenhum evento encontrado</p>
              {searchTerm && <p className="text-sm">Tente buscar com outros termos</p>}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredEvents.map((evento) => {
            const { ocupadas, percentual } = getVagasInfo(evento);

            return (
              <Card
                key={evento.id}
                className="overflow-hidden hover:glow-border-hover transition-all cursor-pointer"
                  onClick={() => navigate(`/campus/evento/${evento.id}`)}
              >
                {/* Banner */}
                <div
                  className="w-full h-40 bg-muted bg-cover bg-center"
                  style={{
                    backgroundImage: evento.banner_url
                      ? `url(${evento.banner_url})`
                      : 'none'
                  }}
                >
                  {!evento.banner_url && (
                    <div className="w-full h-full flex items-center justify-center">
                      <Calendar className="w-12 h-12 text-muted-foreground opacity-20" />
                    </div>
                  )}
                </div>

                {/* Conteúdo */}
                <div className="p-6 space-y-4">
                  {/* Título e Status */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xl font-normal line-clamp-2">{evento.titulo}</h3>
                      {getStatusBadge(evento.status)}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {evento.descricao}
                    </p>
                  </div>

                  {/* Informações */}
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                        {evento.data_inicio !== evento.data_fim && (
                          <> - {format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}</>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      <span className="line-clamp-1">{evento.local}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        {ocupadas}/{evento.capacidade_maxima} inscritos ({percentual}%)
                      </span>
                    </div>

                    {evento.carga_horaria && (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{evento.carga_horaria}h</span>
                      </div>
                    )}
                  </div>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      {evento.tipo}
                    </Badge>
                    {evento.valor > 0 ? (
                      <Badge variant="outline" className="text-xs">
                        R$ {evento.valor.toFixed(2)}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-green-500 border-green-500/20">
                        Gratuito
                      </Badge>
                    )}
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
