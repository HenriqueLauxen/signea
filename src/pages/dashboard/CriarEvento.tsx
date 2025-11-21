import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker } from "@/components/DateRangePicker";
import { Upload, Save, Edit2, X } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

export default function CriarEvento() {
  const [banner, setBanner] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titulo, setTitulo] = useState("Nome do Evento");
  const [palestrantes, setPalestrantes] = useState<string[]>([]);
  const [novoPalestrante, setNovoPalestrante] = useState("");

  const handleAddPalestrante = () => {
    if (novoPalestrante.trim()) {
      setPalestrantes([...palestrantes, novoPalestrante]);
      setNovoPalestrante("");
    }
  };

  const handleRemovePalestrante = (index: number) => {
    setPalestrantes(palestrantes.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    modal.success("Evento criado com sucesso!");
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-3xl font-light">Criar Evento</h1>

      <Card className="overflow-hidden">
        {/* Banner Header */}
        <div className="relative h-48 bg-muted flex items-center justify-center">
          {banner ? (
            <img src={banner} alt="Banner" className="w-full h-full object-cover" />
          ) : (
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Adicionar Banner
            </Button>
          )}
        </div>

        <div className="p-8 space-y-6">
          {/* Título Editável */}
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <Input
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                onBlur={() => setEditingTitle(false)}
                className="text-2xl font-normal"
                autoFocus
              />
            ) : (
              <>
                <h2 className="text-2xl font-normal">{titulo}</h2>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditingTitle(true)}
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>

          {/* Descrição */}
          <div>
            <Label>Descrição do Evento</Label>
            <Textarea placeholder="Descreva o evento..." rows={4} />
          </div>

          {/* Date Range */}
          <div>
            <Label>Período do Evento</Label>
            <DateRangePicker />
          </div>

          {/* Carga Horária */}
          <div>
            <Label>Carga Horária (horas)</Label>
            <Input type="number" placeholder="Ex: 40" />
          </div>

          {/* Palestrantes */}
          <div>
            <Label>Palestrantes</Label>
            <div className="flex gap-2 mb-3">
              <Input
                value={novoPalestrante}
                onChange={(e) => setNovoPalestrante(e.target.value)}
                placeholder="Nome do palestrante"
                onKeyPress={(e) => e.key === "Enter" && handleAddPalestrante()}
              />
              <Button variant="outline" onClick={handleAddPalestrante}>
                Adicionar
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {palestrantes.map((palestrante, index) => (
                <div
                  key={index}
                  className="px-3 py-1 bg-muted rounded-full flex items-center gap-2 text-sm"
                >
                  {palestrante}
                  <button
                    onClick={() => handleRemovePalestrante(index)}
                    className="hover:text-destructive"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline">Cancelar</Button>
            <Button variant="elegant" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Criar Evento
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
