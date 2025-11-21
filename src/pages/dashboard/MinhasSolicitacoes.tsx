import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, FileText, Clock, CheckCircle, XCircle } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockSolicitacoes = [
  { id: 1, nome: "Workshop de Python", status: "pendente", data: "10/01/2025" },
  { id: 2, nome: "Seminário de IA", status: "aprovado", data: "05/01/2025" },
  { id: 3, nome: "Curso de Docker", status: "ajustes", data: "28/12/2024", feedback: "Ajustar carga horária" },
  { id: 4, nome: "Palestra de Blockchain", status: "rejeitado", data: "20/12/2024", motivo: "Não adequado ao calendário" },
];

export default function MinhasSolicitacoes() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const getStatusBadge = (status: string) => {
    const config = {
      pendente: { variant: "outline" as const, icon: Clock, label: "Pendente" },
      aprovado: { variant: "default" as const, icon: CheckCircle, label: "Aprovado" },
      ajustes: { variant: "outline" as const, icon: FileText, label: "Requer Ajustes" },
      rejeitado: { variant: "destructive" as const, icon: XCircle, label: "Rejeitado" },
    };
    const { variant, icon: Icon, label } = config[status as keyof typeof config];
    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const handleCreateSolicitacao = () => {
    modal.success("Solicitação enviada com sucesso!");
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">Minhas Solicitações de Evento</h1>
        <Button variant="elegant" onClick={() => setShowCreateModal(true)}>
          <PlusCircle className="w-4 h-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      <div className="space-y-4">
        {mockSolicitacoes.map((sol) => (
          <Card key={sol.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-normal">{sol.nome}</h3>
                  {getStatusBadge(sol.status)}
                </div>
                <p className="text-sm text-muted-foreground">Enviado em {sol.data}</p>
                {sol.feedback && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Feedback:</p>
                    <p className="text-sm">{sol.feedback}</p>
                  </div>
                )}
                {sol.motivo && (
                  <div className="mt-3 p-3 bg-destructive/10 rounded-md">
                    <p className="text-sm text-muted-foreground mb-1">Motivo da rejeição:</p>
                    <p className="text-sm">{sol.motivo}</p>
                  </div>
                )}
              </div>
              {sol.status === "ajustes" && (
                <Button variant="outline" size="sm">
                  <FileText className="w-4 h-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Criar Solicitação */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome do Evento</Label>
              <Input placeholder="Ex: Workshop de React Avançado" />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea placeholder="Descreva o evento..." rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data de Início</Label>
                <Input type="date" />
              </div>
              <div>
                <Label>Data de Término</Label>
                <Input type="date" />
              </div>
            </div>
            <div>
              <Label>Carga Horária (horas)</Label>
              <Input type="number" placeholder="Ex: 40" />
            </div>
            <div>
              <Label>Palestrantes (separados por vírgula)</Label>
              <Input placeholder="Ex: Dr. João Silva, Profa. Maria Santos" />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowCreateModal(false)}>
                Cancelar
              </Button>
              <Button variant="elegant" onClick={handleCreateSolicitacao}>
                Enviar Solicitação
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
