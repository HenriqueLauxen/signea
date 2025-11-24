import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Plus, QrCode, Users, Calendar, Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
// import { modal } from "@/contexts/ModalContext"; // Removed modal usage
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { logout } from "@/lib/sessionManager";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type Tab = "events" | "students";

interface Evento {
  id: number;
  titulo: string;
  data_inicio: string;
  carga_horaria: number;
  banner_url: string | null;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
  matricula: string;
  curso: string;
}

const AdminDashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("events");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);

  const [events, setEvents] = useState<Evento[]>([]);
  const [students, setStudents] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "events") {
        const { data, error } = await supabase
          .from("eventos")
          .select("id, titulo, data_inicio, carga_horaria, banner_url")
          .order("data_inicio", { ascending: false });

        if (error) throw error;
        setEvents(data || []);
      } else {
        const { data, error } = await supabase
          .from("usuarios")
          .select("id, nome, email, matricula, curso:curso_id(nome)")
          .eq("perfil", "user") // Assuming 'user' is the profile for students
          .order("nome");

        if (error) throw error;

        // Transform data to flatten curso object if needed
        const formattedStudents = data?.map((user: any) => ({
          ...user,
          curso: user.curso?.nome || "N/A"
        })) || [];

        setStudents(formattedStudents);
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleGenerateQR = () => {
    setShowQRModal(true);
    toast.success("QR Code e chave gerados com sucesso!");
  };

  const filteredStudents = students.filter(student =>
    student.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
              className={`flex items-center gap-2 px-6 py-3 rounded-lg border transition-all ${activeTab === key
                  ? "border-border bg-card glow-border"
                  : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "events" ? (
          <div className="space-y-6">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-transparent border border-border hover:glow-border-hover"
            >
              <Plus className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">Nenhum evento encontrado.</p>
              ) : (
                events.map((event) => (
                  <Card
                    key={event.id}
                    className="overflow-hidden bg-card border-border hover:glow-border-hover cursor-pointer"
                    onClick={() => setSelectedEvent(event.id)}
                  >
                    {event.banner_url ? (
                      <img src={event.banner_url} alt={event.titulo} className="w-full h-40 object-cover" />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center">
                        <Calendar className="w-12 h-12 text-muted-foreground opacity-20" />
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="text-lg font-normal line-clamp-1">{event.titulo}</h3>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(event.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm text-muted-foreground">{event.carga_horaria}h de carga horária</p>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 max-w-md">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Buscar aluno..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none focus:outline-none w-full text-sm"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStudents.length === 0 ? (
                <p className="text-muted-foreground col-span-full text-center py-8">Nenhum aluno encontrado.</p>
              ) : (
                filteredStudents.map((student) => (
                  <Card key={student.id} className="p-6 bg-card border-border hover:glow-border-hover">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {student.nome.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-normal">{student.nome}</h3>
                        <p className="text-sm text-muted-foreground">{student.email}</p>
                        <p className="text-xs text-muted-foreground mt-1">Matrícula: {student.matricula}</p>
                        <p className="text-xs text-muted-foreground">Curso: {student.curso}</p>
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Criar Evento */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-md">
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
