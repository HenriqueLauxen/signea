import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Download, Calendar, CheckCircle, User } from "lucide-react";

type Tab = "certificates" | "events" | "attendance" | "profile";

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("certificates");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("userType");
    navigate("/");
  };

  const mockCertificates = [
    { id: 1, event: "Semana de Tecnologia 2025", date: "12/01/2025", hours: 40 },
    { id: 2, event: "Workshop de React", date: "05/01/2025", hours: 8 },
  ];

  const mockEvents = [
    { id: 1, name: "Semana de Tecnologia 2025", date: "12-16/01/2025", hours: 40, active: false, attended: true },
    { id: 2, name: "Workshop de React", date: "05/01/2025", hours: 8, active: false, attended: true },
    { id: 3, name: "Hackathon 2025", date: "20-22/02/2025", hours: 24, active: true, attended: false },
  ];

  const mockAttendance = [
    { id: 1, event: "Semana de Tecnologia 2025", date: "12/01/2025", time: "09:00", status: "Validado" },
    { id: 2, event: "Workshop de React", date: "05/01/2025", time: "14:30", status: "Validado" },
  ];

  return (
    <div className="min-h-screen">
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-light tracking-wider">SIGNEA</h1>
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
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {[
            { key: "certificates", label: "Meus Certificados", icon: Download },
            { key: "events", label: "Eventos", icon: Calendar },
            { key: "attendance", label: "Minhas Presenças", icon: CheckCircle },
            { key: "profile", label: "Meu Perfil", icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key as Tab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all whitespace-nowrap ${
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

        <div className="max-w-4xl mx-auto">
          {activeTab === "certificates" && (
            <div className="space-y-4">
              {mockCertificates.map((cert) => (
                <Card key={cert.id} className="p-6 bg-card border-border hover:glow-border-hover">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-normal mb-1">{cert.event}</h3>
                      <p className="text-sm text-muted-foreground">
                        Emitido em {cert.date} • {cert.hours}h
                      </p>
                    </div>
                    <Button className="bg-transparent border border-border hover:glow-border-hover">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "events" && (
            <div className="space-y-4">
              {mockEvents.map((event) => (
                <Card
                  key={event.id}
                  className={`p-6 border transition-all ${
                    event.active
                      ? "bg-card border-border glow-border"
                      : "bg-muted/30 border-border/50 opacity-70"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-normal mb-2">{event.name}</h3>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>Data: {event.date}</p>
                        <p>Carga horária: {event.hours}h</p>
                        <p className={event.attended ? "text-green-500" : ""}>
                          Status: {event.attended ? "Presença validada" : "Não participou"}
                        </p>
                      </div>
                    </div>
                    {event.active && (
                      <span className="px-3 py-1 text-xs border border-border rounded-full">
                        Ativo
                      </span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "attendance" && (
            <div className="space-y-4">
              {mockAttendance.map((record) => (
                <Card key={record.id} className="p-6 bg-card border-border hover:glow-border-hover">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-normal mb-2">{record.event}</h3>
                      <p className="text-sm text-muted-foreground">
                        {record.date} às {record.time}
                      </p>
                    </div>
                    <span className="px-3 py-1 text-xs text-green-500 border border-green-500/30 rounded-full">
                      {record.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {activeTab === "profile" && (
            <Card className="p-8 bg-card border-border">
              <div className="text-center space-y-6">
                <div className="w-24 h-24 mx-auto rounded-full bg-muted border border-border flex items-center justify-center">
                  <User className="w-12 h-12 text-muted-foreground" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-light">João Silva</h2>
                  <p className="text-muted-foreground">Matrícula: 20251234</p>
                  <p className="text-muted-foreground">joao.silva@instituicao.edu.br</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
