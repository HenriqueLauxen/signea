import { Card } from "@/components/ui/card";
import { Calendar, Users, Award, TrendingUp } from "lucide-react";

const mockStats = [
  { label: "Eventos Ativos", value: "12", icon: Calendar, color: "text-blue-500" },
  { label: "Usuários Totais", value: "1,248", icon: Users, color: "text-green-500" },
  { label: "Certificados Emitidos", value: "3,456", icon: Award, color: "text-purple-500" },
  { label: "Taxa de Presença", value: "87%", icon: TrendingUp, color: "text-orange-500" },
];

export default function VisaoGeral() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Visão Geral do Campus</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {mockStats.map((stat, index) => {
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
        <h2 className="text-xl font-light mb-4">Eventos Recentes</h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 bg-muted rounded-lg">
              <p className="font-normal">Evento de Exemplo {i}</p>
              <p className="text-sm text-muted-foreground">Data: 12/01/2025</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
