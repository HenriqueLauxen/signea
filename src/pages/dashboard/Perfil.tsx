import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Save } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

export default function Perfil() {
  const [nome, setNome] = useState("João Silva");
  const [email] = useState("joao.silva@instituicao.edu.br");
  const [matricula] = useState("20251234");

  const handleSave = () => {
    modal.success("Perfil atualizado com sucesso!");
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-light">Meu Perfil</h1>

      <Card className="p-8">
        <div className="flex flex-col items-center gap-6 mb-8">
          <Avatar className="w-32 h-32">
            <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=user" />
            <AvatarFallback>JS</AvatarFallback>
          </Avatar>
          <Button variant="outline" size="sm">
            <Upload className="w-4 h-4 mr-2" />
            Alterar Foto
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>

          <div>
            <Label>E-mail Institucional</Label>
            <Input value={email} disabled />
          </div>

          <div>
            <Label>Matrícula</Label>
            <Input value={matricula} disabled />
          </div>

          <Button variant="elegant" onClick={handleSave} className="w-full">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </div>
      </Card>
    </div>
  );
}
