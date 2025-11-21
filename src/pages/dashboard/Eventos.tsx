import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Clock, Users, DollarSign, Copy, CheckCircle } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockEvents = [
  {
    id: 1,
    name: "Semana de Tecnologia 2025",
    date: "12-16/01/2025",
    hours: 40,
    status: "inscrito",
    paymentStatus: "aprovado",
    price: 0,
    banner: "https://picsum.photos/seed/tech/800/300",
  },
  {
    id: 2,
    name: "Workshop de React Avançado",
    date: "05/02/2025",
    hours: 8,
    status: "disponivel",
    paymentStatus: null,
    price: 50,
    banner: "https://picsum.photos/seed/react/800/300",
  },
  {
    id: 3,
    name: "Hackathon 2025",
    date: "20-22/03/2025",
    hours: 24,
    status: "inscrito",
    paymentStatus: "pendente",
    price: 100,
    banner: "https://picsum.photos/seed/hack/800/300",
  },
];

export default function Eventos() {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const handleSubscribe = (event: any) => {
    if (event.price > 0) {
      setSelectedEvent(event);
      setShowPaymentModal(true);
    } else {
      modal.success("Inscrição realizada com sucesso!");
    }
  };

  const copyPixKey = () => {
    navigator.clipboard.writeText("00020126330014BR.GOV.BCB.PIX0111123456789525204000053039865802BR5925SIGNEA");
    modal.success("Chave PIX copiada!");
  };

  const markAsPaid = () => {
    modal.success("Pagamento marcado como realizado!");
    setShowPaymentModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">Eventos</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {mockEvents.map((event) => (
          <Card key={event.id} className="overflow-hidden hover:glow-border-hover transition-all">
            <img src={event.banner} alt={event.name} className="w-full h-48 object-cover" />
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-normal">{event.name}</h3>
                <Badge variant={event.status === "inscrito" ? "default" : "outline"}>
                  {event.status === "inscrito" ? "Inscrito" : "Disponível"}
                </Badge>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  {event.date}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {event.hours}h de carga horária
                </div>
                {event.price > 0 && (
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    R$ {event.price},00
                  </div>
                )}
              </div>

              {event.paymentStatus && (
                <Badge
                  variant={
                    event.paymentStatus === "aprovado"
                      ? "default"
                      : event.paymentStatus === "pendente"
                      ? "outline"
                      : "destructive"
                  }
                >
                  Pagamento: {event.paymentStatus}
                </Badge>
              )}

              <div className="flex gap-2">
                {event.status === "disponivel" ? (
                  <Button variant="elegant" onClick={() => handleSubscribe(event)} className="flex-1">
                    <Users className="w-4 h-4 mr-2" />
                    Inscrever-se
                  </Button>
                ) : (
                  <Button variant="outline" disabled className="flex-1">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Inscrito
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de Pagamento PIX */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pagamento do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="font-normal mb-2">{selectedEvent?.name}</h3>
              <p className="text-2xl font-light">R$ {selectedEvent?.price},00</p>
            </div>

            <div className="bg-white p-4 rounded-lg flex items-center justify-center">
              <div className="w-48 h-48 bg-muted rounded flex items-center justify-center">
                <span className="text-xs text-muted-foreground">QR Code PIX</span>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Chave PIX (Copia e Cola):</p>
              <div className="flex gap-2">
                <input
                  readOnly
                  value="00020126330014BR.GOV.BCB.PIX..."
                  className="flex-1 px-3 py-2 text-xs bg-muted border border-border rounded-md"
                />
                <Button size="sm" variant="elegant" onClick={copyPixKey}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="elegant" onClick={markAsPaid} className="flex-1">
                Marcar como Pago
              </Button>
              <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
