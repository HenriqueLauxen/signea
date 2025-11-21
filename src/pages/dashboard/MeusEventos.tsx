import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Users, CheckCircle, DollarSign, Award, BarChart } from "lucide-react";
import { useNavigate } from "react-router-dom";

const mockEventos = [
  {
    id: 1,
    name: "Semana de Tecnologia 2025",
    date: "12-16/01/2025",
    hours: 40,
    inscritos: 120,
    presencas: 95,
    banner: "https://picsum.photos/seed/tech/400/200",
  },
  {
    id: 2,
    name: "Workshop de React",
    date: "05/02/2025",
    hours: 8,
    inscritos: 45,
    presencas: 42,
    banner: "https://picsum.photos/seed/react/400/200",
  },
];

export default function MeusEventos() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Meus Eventos</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockEventos.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:glow-border-hover transition-all cursor-pointer" onClick={() => navigate(`/dashboard/evento/${event.id}`)}>
            <img src={event.banner} alt={event.name} className="w-full h-40 object-cover" />
            <div className="p-6 space-y-4">
              <h3 className="text-xl font-normal">{event.name}</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  {event.inscritos} inscritos
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {event.presencas} presenças validadas
                </div>
              </div>
              <div className="flex gap-2">
                <Badge variant="outline">
                  {event.hours}h
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
