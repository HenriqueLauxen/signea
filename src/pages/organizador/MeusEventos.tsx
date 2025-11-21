import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle, Clock, MapPin, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";
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

export default function MeusEventos() {
  const navigate = useNavigate();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarEventos = async () => {
    try {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        modal.error("Você precisa estar logado");
        navigate("/login");
        return;
      }

      // Buscar campus do usuário
      const { data: userData } = await supabase
        .from('usuarios')
        .select('campus')
        .eq('email', session.user.email)
        .single();

      const userCampus = userData?.campus;

      // Buscar TODOS os eventos do campus, não apenas os do organizador
      let query = supabase
        .from('eventos')
        .select('*')
        .order('created_at', { ascending: false });

      // Se o usuário tem campus definido, filtrar por campus
      if (userCampus) {
        query = query.eq('campus', userCampus);
      }

      const { data, error } = await query;

      if (error) throw error;

      setEventos(data || []);
    } catch (error) {
      console.error('Erro ao carregar eventos:', error);
      modal.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarEventos();
    
    // Real-time subscription
    const channel = supabase
      .channel('meus-eventos-changes')
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Eventos</h1>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Eventos</h1>
        <Button onClick={() => navigate("/organizador/criar-evento")}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {eventos.length === 0 ? (
        <Card className="p-12">
          <div className="text-center text-muted-foreground space-y-4">
            <Calendar className="w-12 h-12 mx-auto opacity-50" />
            <div>
              <p className="text-lg">Você ainda não criou nenhum evento</p>
              <p className="text-sm">Clique em "Novo Evento" para começar</p>
            </div>
            <Button onClick={() => navigate("/organizador/criar-evento")}>
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Evento
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {eventos.map((evento) => {
            const { ocupadas, percentual } = getVagasInfo(evento);
            
            return (
              <Card 
                key={evento.id} 
                className="overflow-hidden hover:glow-border-hover transition-all cursor-pointer" 
                onClick={() => navigate(`/organizador/evento/${evento.id}`)}
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
