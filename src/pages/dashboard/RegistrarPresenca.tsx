import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Calendar } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockEventos = [
  { id: 1, name: "Semana de Tecnologia 2025", dias: ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"] },
  { id: 2, name: "Workshop de React", dias: ["Sábado"] },
];

const mockPresencas = [
  { id: 1, evento: "Semana de Tecnologia 2025", dia: "Segunda", data: "12/01/2025", hora: "09:00" },
  { id: 2, evento: "Semana de Tecnologia 2025", dia: "Terça", data: "13/01/2025", hora: "09:15" },
];

export default function RegistrarPresenca() {
  const [selectedEvento, setSelectedEvento] = useState("");
  const [selectedDia, setSelectedDia] = useState("");
  const [palavraChave, setPalavraChave] = useState("");

  const handleValidarPresenca = () => {
    if (!selectedEvento || !selectedDia || !palavraChave) {
      modal.error("Preencha todos os campos");
      return;
    }
    modal.success("Presença registrada com sucesso!");
    setPalavraChave("");
  };

  const eventoSelecionado = mockEventos.find((e) => e.id.toString() === selectedEvento);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Registrar Presença</h1>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label>Selecione o Evento</Label>
            <Select value={selectedEvento} onValueChange={setSelectedEvento}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um evento" />
              </SelectTrigger>
              <SelectContent>
                {mockEventos.map((evento) => (
                  <SelectItem key={evento.id} value={evento.id.toString()}>
                    {evento.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {eventoSelecionado && (
            <div>
              <Label>Selecione o Dia</Label>
              <Select value={selectedDia} onValueChange={setSelectedDia}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um dia" />
                </SelectTrigger>
                <SelectContent>
                  {eventoSelecionado.dias.map((dia) => (
                    <SelectItem key={dia} value={dia}>
                      {dia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label>Palavra-chave do Dia</Label>
            <Input
              type="password"
              value={palavraChave}
              onChange={(e) => setPalavraChave(e.target.value)}
              placeholder="Digite a palavra-chave"
            />
          </div>

          <Button variant="elegant" onClick={handleValidarPresenca} className="w-full">
            <CheckCircle className="w-4 h-4 mr-2" />
            Validar Presença
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-light">Presenças Confirmadas</h2>
        {mockPresencas.map((presenca) => (
          <Card key={presenca.id} className="p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-normal">{presenca.evento}</h3>
                <p className="text-sm text-muted-foreground">
                  {presenca.dia} - {presenca.data} às {presenca.hora}
                </p>
              </div>
              <Badge variant="default">
                <CheckCircle className="w-3 h-3 mr-1" />
                Validada
              </Badge>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
