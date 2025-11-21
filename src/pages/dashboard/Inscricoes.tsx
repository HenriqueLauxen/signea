import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, DollarSign, XCircle } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockInscricoes = [
  {
    id: 1,
    eventName: "Semana de Tecnologia 2025",
    date: "12-16/01/2025",
    hours: 40,
    inscricaoStatus: "confirmada",
    paymentStatus: "aprovado",
    price: 0,
  },
  {
    id: 2,
    eventName: "Hackathon 2025",
    date: "20-22/03/2025",
    hours: 24,
    inscricaoStatus: "pendente",
    paymentStatus: "pendente",
    price: 100,
  },
];

export default function Inscricoes() {
  const handleCancelInscricao = (id: number) => {
    modal.success("Inscrição cancelada com sucesso");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Minhas Inscrições</h1>

      <div className="space-y-4">
        {mockInscricoes.map((inscricao) => (
          <Card key={inscricao.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-normal mb-2">{inscricao.eventName}</h3>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {inscricao.date}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {inscricao.hours}h
                  </div>
                  {inscricao.price > 0 && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      R$ {inscricao.price},00
                    </div>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <Badge
                  variant={inscricao.inscricaoStatus === "confirmada" ? "default" : "outline"}
                >
                  {inscricao.inscricaoStatus === "confirmada" ? "Confirmada" : "Pendente"}
                </Badge>
                {inscricao.price > 0 && (
                  <Badge
                    variant={
                      inscricao.paymentStatus === "aprovado"
                        ? "default"
                        : inscricao.paymentStatus === "pendente"
                        ? "outline"
                        : "destructive"
                    }
                  >
                    Pag: {inscricao.paymentStatus}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleCancelInscricao(inscricao.id)}
              className="text-destructive hover:text-destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancelar Inscrição
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
