import { useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, QrCode, Users, DollarSign, Award, BarChart, Eye, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { modal } from "@/contexts/ModalContext";

const mockPresencas = [
  { dia: "Segunda", alunos: [
    { nome: "João Silva", matricula: "20251234", hora: "09:00", status: "presente" },
    { nome: "Maria Santos", matricula: "20251235", hora: "09:15", status: "presente" },
  ]},
  { dia: "Terça", alunos: [
    { nome: "João Silva", matricula: "20251234", hora: "09:05", status: "presente" },
  ]},
];

const mockInscricoes = [
  { id: 1, nome: "João Silva", matricula: "20251234", inscricaoStatus: "confirmada", pagamentoStatus: "aprovado" },
  { id: 2, nome: "Maria Santos", matricula: "20251235", inscricaoStatus: "confirmada", pagamentoStatus: "pendente" },
  { id: 3, nome: "Pedro Costa", matricula: "20251236", inscricaoStatus: "pendente", pagamentoStatus: "pendente" },
];

export default function EventoDetalhes() {
  const { id } = useParams();
  const [showQRModal, setShowQRModal] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [selectedDia, setSelectedDia] = useState("Segunda");
  const [statusFilter, setStatusFilter] = useState("todos");

  const handleGerarQR = () => {
    setShowQRModal(true);
    modal.success("QR Code gerado com sucesso!");
  };

  const handleValidarPagamento = (id: number) => {
    modal.success("Pagamento validado!");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">Semana de Tecnologia 2025</h1>
        <Badge>12-16/01/2025</Badge>
      </div>

      <Tabs defaultValue="presencas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="presencas">Presenças</TabsTrigger>
          <TabsTrigger value="inscricoes">Inscrições & Pagamentos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="presencas" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {mockPresencas.map((p) => (
                <Button
                  key={p.dia}
                  variant={selectedDia === p.dia ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDia(p.dia)}
                >
                  {p.dia}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="presente">Presente</SelectItem>
                  <SelectItem value="ausente">Ausente</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="elegant" onClick={handleGerarQR}>
                <QrCode className="w-4 h-4 mr-2" />
                Gerar QR Code
              </Button>
            </div>
          </div>

          <Card className="p-6">
            <div className="space-y-3">
              {mockPresencas
                .find((p) => p.dia === selectedDia)
                ?.alunos.map((aluno, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-4">
                      <Checkbox defaultChecked={aluno.status === "presente"} />
                      <div>
                        <p className="font-normal">{aluno.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {aluno.matricula} - {aluno.hora}
                        </p>
                      </div>
                    </div>
                    <Badge variant={aluno.status === "presente" ? "default" : "outline"}>
                      {aluno.status}
                    </Badge>
                  </div>
                ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inscricoes" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-3">
              {mockInscricoes.map((inscricao) => (
                <div key={inscricao.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-normal">{inscricao.nome}</p>
                    <p className="text-sm text-muted-foreground">{inscricao.matricula}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inscricao.inscricaoStatus === "confirmada" ? "default" : "outline"}>
                      {inscricao.inscricaoStatus}
                    </Badge>
                    <Badge
                      variant={
                        inscricao.pagamentoStatus === "aprovado"
                          ? "default"
                          : "outline"
                      }
                    >
                      Pag: {inscricao.pagamentoStatus}
                    </Badge>
                    {inscricao.pagamentoStatus === "pendente" && (
                      <Button
                        size="sm"
                        variant="elegant"
                        onClick={() => handleValidarPagamento(inscricao.id)}
                      >
                        Validar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="space-y-4">
          <Card className="p-6">
            <p className="text-muted-foreground">Gerenciamento de certificados em desenvolvimento</p>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <Card className="p-6">
            <div className="flex gap-2">
              <Button variant="elegant">
                <BarChart className="w-4 h-4 mr-2" />
                Exportar Presenças
              </Button>
              <Button variant="elegant">
                <Users className="w-4 h-4 mr-2" />
                Exportar Inscritos
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code - {selectedDia}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-center">
            <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 flex items-center justify-center">
              <QrCode className="w-full h-full text-background" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Chave do dia:</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-mono tracking-wider">
                  {showKey ? "ABC123" : "••••••"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Link compartilhável:</p>
              <code className="text-xs">https://signea.app/validar-presenca?e=1&d=1</code>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
