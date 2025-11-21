import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode, Users, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { modal } from "@/contexts/ModalContext";

type Tab = "events" | "students";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    navigate("/");
  };

  const mockEvents = [
    { id: 1, name: "Semana de Tecnologia 2025", date: "12-16/01/2025", hours: 40, banner: "https://picsum.photos/seed/tech/400/200" },
    { id: 2, name: "Workshop de React", date: "05/01/2025", hours: 8, banner: "https://picsum.photos/seed/react/400/200" },
    { id: 3, name: "Hackathon 2025", date: "20-22/02/2025", hours: 24, banner: "https://picsum.photos/seed/hack/400/200" },
  ];

  const handleGenerateQR = () => {
    setShowQRModal(true);
    modal.success("QR Code e chave gerados com sucesso!");
  };

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-light tracking-wider">SIGNEA Admin</h1>
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
          >
            Sair
          </Button>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-4 mb-8">
          {[
            { key: "events", label: "Eventos", icon: Calendar },
            { key: "students", label: "Alunos Ativos", icon: Users },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all ${
                activeTab === key
                  ? "border-border bg-card glow-border"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === "events" && (
          <div className="space-y-6">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-transparent border border-border hover:glow-border-hover"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockEvents.map((event) => (
                <Card
                  key={event.id}
                  className="overflow-hidden bg-card border-border hover:glow-border-hover cursor-pointer"
                  onClick={() => setSelectedEvent(event.id)}
                >
                  <img src={event.banner} alt={event.name} className="w-full h-40 object-cover" />
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-normal">{event.name}</h3>
                    <p className="text-sm text-muted-foreground">{event.date}</p>
                    <p className="text-sm text-muted-foreground">{event.hours}h de carga horária</p>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeTab === "students" && (
          <Card className="p-6 bg-card border-border">
            <p className="text-muted-foreground text-center">Lista de alunos ativos será exibida aqui</p>
          </Card>
        )}
      </div>

      {/* Modal Criar Evento */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar Novo Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Nome do evento" className="bg-transparent border-border" />
            <Input placeholder="Carga horária (horas)" type="number" className="bg-transparent border-border" />
            <Input placeholder="Data de início" type="date" className="bg-transparent border-border" />
            <Input placeholder="Data de término" type="date" className="bg-transparent border-border" />
            <Button className="w-full bg-transparent border border-border hover:glow-border-hover">
              Criar Evento
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Detalhes do Evento */}
      <Dialog open={selectedEvent !== null} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Button
              onClick={handleGenerateQR}
              className="w-full bg-transparent border border-border hover:glow-border-hover"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Gerar QR Code e Chave do Dia
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Presenças e estatísticas serão exibidas aqui
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 flex items-center justify-center">
              <QrCode className="w-full h-full text-background" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Chave do dia:</p>
              <p className="text-2xl font-mono tracking-wider">••••••</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
