import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Calendar, Users, Award, TrendingUp, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { format, subDays, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardStats {
  eventosAtivos: number;
  usuariosTotais: number;
  certificadosEmitidos: number;
  taxaPresenca: string;
}

interface EventoRecente {
  id: number;
  titulo: string;
  data_inicio: string;
}

export default function VisaoGeral() {
  const [stats, setStats] = useState<DashboardStats>({
    eventosAtivos: 0,
    usuariosTotais: 0,
    certificadosEmitidos: 0,
    taxaPresenca: "0%",
  });
  const [eventosRecentes, setEventosRecentes] = useState<EventoRecente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const hoje = new Date().toISOString();
      const trintaDiasAtras = subDays(new Date(), 30).toISOString();
      const trintaDiasFrente = addDays(new Date(), 30).toISOString();

      // 1. Eventos Ativos (data_fim >= hoje)
      const { count: eventosCount } = await supabase
        .from("eventos")
        .select("*", { count: "exact", head: true })
        .gte("data_fim", hoje);

      // 2. Usuários Totais
      const { count: usuariosCount } = await supabase
        .from("usuarios")
        .select("*", { count: "exact", head: true });

      // 3. Certificados Emitidos
      const { count: certificadosCount } = await supabase
        .from("certificados")
        .select("*", { count: "exact", head: true });

      // 4. Taxa de Presença (Alunos que foram em TODOS os eventos que se inscreveram)
      // Buscar todas as inscrições com status de presença
      const { data: inscricoes } = await supabase
        .from("inscricoes")
        .select("user_id, presente");

      let taxa = "0%";
      if (inscricoes && inscricoes.length > 0) {
        // Agrupar por usuário
        const userInscricoes: Record<string, boolean[]> = {};

        inscricoes.forEach((insc) => {
          if (!userInscricoes[insc.user_id]) {
            userInscricoes[insc.user_id] = [];
          }
          userInscricoes[insc.user_id].push(insc.presente || false);
        });

        // Contar quantos usuários têm 100% de presença
        let usuariosComPresencaTotal = 0;
        const totalUsuariosComInscricao = Object.keys(userInscricoes).length;

        Object.values(userInscricoes).forEach((presencas) => {
          const foiEmTodos = presencas.every((p) => p === true);
          if (foiEmTodos) {
            usuariosComPresencaTotal++;
          }
        });

        if (totalUsuariosComInscricao > 0) {
          const porcentagem = (usuariosComPresencaTotal / totalUsuariosComInscricao) * 100;
          taxa = `${porcentagem.toFixed(0)}%`;
        }
      }

      setStats({
        eventosAtivos: eventosCount || 0,
        usuariosTotais: usuariosCount || 0,
        certificadosEmitidos: certificadosCount || 0,
        taxaPresenca: taxa,
      });

      // 5. Eventos Recentes (+/- 30 dias)
      const { data: eventos } = await supabase
        .from("eventos")
        .select("id, titulo, data_inicio")
        .gte("data_inicio", trintaDiasAtras)
        .lte("data_inicio", trintaDiasFrente)
        .order("data_inicio", { ascending: true })
        .limit(5);

      setEventosRecentes(eventos || []);

    } catch (error) {
      console.error("Erro ao carregar dashboard:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const statCards = [
    { label: "Eventos Ativos", value: stats.eventosAtivos.toString(), icon: Calendar, color: "text-blue-500" },
    { label: "Usuários Totais", value: stats.usuariosTotais.toString(), icon: Users, color: "text-green-500" },
    { label: "Certificados Emitidos", value: stats.certificadosEmitidos.toString(), icon: Award, color: "text-purple-500" },
    { label: "Taxa de Fidelidade", value: stats.taxaPresenca, icon: TrendingUp, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Visão Geral do Campus</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Icon className={`w-8 h-8 ${stat.color}`} />
              </div>
              <p className="text-3xl font-light mb-1">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </Card>
          );
        })}
      </div>

      <Card className="p-6">
        <h2 className="text-xl font-light mb-4">Eventos Recentes (30 dias)</h2>
        <div className="space-y-3">
          {eventosRecentes.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">Nenhum evento recente.</p>
          ) : (
            eventosRecentes.map((evento) => (
              <div key={evento.id} className="p-4 bg-muted/50 rounded-lg flex justify-between items-center">
                <p className="font-normal">{evento.titulo}</p>
                <p className="text-sm text-muted-foreground">
                  {format(new Date(evento.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              </div>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
