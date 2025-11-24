import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Users, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

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
}

export default function EventoDetalhesCampus() {
  const { id } = useParams();
  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvento = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("eventos")
        .select("*")
        .eq("id", id)
        .single();
      setEvento(data || null);
      setLoading(false);
    };
    fetchEvento();
  }, [id]);

  if (loading) return <div className="p-12 text-center">Carregando...</div>;
  if (!evento) return <div className="p-12 text-center">Evento não encontrado</div>;

  const ocupadas = evento.capacidade_maxima - evento.vagas_disponiveis;
  const percentual = Math.round((ocupadas / evento.capacidade_maxima) * 100);

  return (
    <Card className="max-w-2xl mx-auto mt-8 p-6">
      {evento.banner_url && (
        <img src={evento.banner_url} alt={evento.titulo} className="w-full h-40 object-cover rounded-lg mb-4" />
      )}
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">{evento.titulo}</h1>
        <p className="text-muted-foreground">{evento.descricao}</p>
        <div className="flex flex-wrap gap-4 mt-2">
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
            <span>{evento.local}</span>
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
        <div className="flex flex-wrap gap-2 mt-2">
          <Badge variant="outline" className="text-xs">{evento.tipo}</Badge>
          {evento.valor > 0 ? (
            <Badge variant="outline" className="text-xs">R$ {evento.valor.toFixed(2)}</Badge>
          ) : (
            <Badge variant="outline" className="text-xs text-green-500 border-green-500/20">Gratuito</Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
