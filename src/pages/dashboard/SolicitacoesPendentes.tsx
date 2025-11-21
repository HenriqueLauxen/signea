import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { Clock, Eye, CheckCircle, XCircle, FileText } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockSolicitacoes = [
  { id: 1, nome: "Workshop de Python", solicitante: "Prof. João Silva", data: "10/01/2025", hours: 8 },
  { id: 2, nome: "Seminário de IA", solicitante: "Profa. Maria Santos", data: "05/01/2025", hours: 4 },
];

export default function SolicitacoesPendentes() {
  const [selectedSolicitacao, setSelectedSolicitacao] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [showAjustesModal, setShowAjustesModal] = useState(false);
  const [feedback, setFeedback] = useState("");

  const handleAprovar = () => {
    modal.success("Solicitação aprovada com sucesso!");
    setShowModal(false);
  };

  const handleSolicitarAjustes = () => {
    modal.success("Feedback enviado para ajustes!");
    setShowAjustesModal(false);
    setShowModal(false);
  };

  const handleRejeitar = () => {
    modal.success("Solicitação rejeitada!");
    setShowModal(false);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Solicitações Pendentes</h1>

      <div className="space-y-4">
        {mockSolicitacoes.map((sol) => (
          <Card key={sol.id} className="p-6">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-normal">{sol.nome}</h3>
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Pendente
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Solicitado por: {sol.solicitante}</p>
                  <p>Data: {sol.data}</p>
                  <p>Carga horária: {sol.hours}h</p>
                </div>
              </div>
              <Button
                variant="elegant"
                size="sm"
                onClick={() => {
                  setSelectedSolicitacao(sol);
                  setShowModal(true);
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                Analisar
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal Analisar */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Analisar Solicitação</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-normal mb-4">{selectedSolicitacao?.nome}</h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-muted-foreground">Solicitante:</span> {selectedSolicitacao?.solicitante}</p>
                <p><span className="text-muted-foreground">Carga horária:</span> {selectedSolicitacao?.hours}h</p>
                <p><span className="text-muted-foreground">Data de envio:</span> {selectedSolicitacao?.data}</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="elegant" onClick={handleAprovar} className="flex-1">
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar
              </Button>
              <Button variant="outline" onClick={() => setShowAjustesModal(true)} className="flex-1">
                <FileText className="w-4 h-4 mr-2" />
                Solicitar Ajustes
              </Button>
              <Button variant="outline" onClick={handleRejeitar} className="flex-1 text-destructive">
                <XCircle className="w-4 h-4 mr-2" />
                Rejeitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Solicitar Ajustes */}
      <Dialog open={showAjustesModal} onOpenChange={setShowAjustesModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Solicitar Ajustes</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Descreva os ajustes necessários..."
              rows={6}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAjustesModal(false)}>
                Cancelar
              </Button>
              <Button variant="elegant" onClick={handleSolicitarAjustes}>
                Enviar Feedback
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
