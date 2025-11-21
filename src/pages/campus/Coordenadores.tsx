import { useState, useEffect, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Edit, Trash2, CheckCircle, XCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";
import { useToast } from "@/contexts/ToastContext";

interface Coordenador {
  id: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  created_at: string;
}

export default function Coordenadores() {
  const [coordenadores, setCoordenadores] = useState<Coordenador[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const toast = useToast();

  const fetchCoordenadores = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("coordenadores")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setCoordenadores(data || []);
    } catch (error: any) {
      console.error("Erro ao buscar coordenadores:", error);
      toast.error("Erro ao carregar coordenadores");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCoordenadores();
  }, [fetchCoordenadores]);

  const handleOpenDialog = (coordenador?: Coordenador) => {
    if (coordenador) {
      setEditingId(coordenador.id);
      setFormData({ nome: coordenador.nome, descricao: coordenador.descricao });
    } else {
      setEditingId(null);
      setFormData({ nome: "", descricao: "" });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingId(null);
    setFormData({ nome: "", descricao: "" });
  };

  const handleSave = async () => {
    if (!formData.nome.trim() || !formData.descricao.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    try {
      if (editingId) {
        // Atualizar
        const { error } = await supabase
          .from("coordenadores")
          .update({
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim(),
          })
          .eq("id", editingId);

        if (error) throw error;
        toast.success("Coordenador atualizado com sucesso");
      } else {
        // Criar
        const { error } = await supabase.from("coordenadores").insert({
          nome: formData.nome.trim(),
          descricao: formData.descricao.trim(),
        });

        if (error) throw error;
        toast.success("Coordenador criado com sucesso");
      }

      handleCloseDialog();
      fetchCoordenadores();
    } catch (error: any) {
      console.error("Erro ao salvar coordenador:", error);
      toast.error(error.message || "Erro ao salvar coordenador");
    }
  };

  const handleToggleAtivo = async (coordenador: Coordenador) => {
    try {
      const { error } = await supabase
        .from("coordenadores")
        .update({ ativo: !coordenador.ativo })
        .eq("id", coordenador.id);

      if (error) throw error;
      toast.success(
        `Coordenador ${coordenador.ativo ? "desativado" : "ativado"} com sucesso`
      );
      fetchCoordenadores();
    } catch (error: any) {
      console.error("Erro ao alterar status:", error);
      toast.error("Erro ao alterar status do coordenador");
    }
  };

  const handleDelete = async (id: string) => {
    const confirm = await modal.confirm(
      "Tem certeza que deseja excluir este coordenador? Esta ação não pode ser desfeita."
    );

    if (!confirm) return;

    try {
      const { error } = await supabase.from("coordenadores").delete().eq("id", id);

      if (error) throw error;
      toast.success("Coordenador excluído com sucesso");
      fetchCoordenadores();
    } catch (error: any) {
      console.error("Erro ao excluir coordenador:", error);
      if (error.code === "23503") {
        toast.error("Não é possível excluir: coordenador está sendo usado em eventos");
      } else {
        toast.error("Erro ao excluir coordenador");
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Coordenadores</h1>
          <p className="text-muted-foreground">Gerencie os coordenadores de cursos</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light tracking-tight">Coordenadores</h1>
          <p className="text-muted-foreground">Gerencie os coordenadores de cursos</p>
        </div>
        <Button onClick={() => handleOpenDialog()} variant="elegant">
          <Plus className="w-4 h-4 mr-2" />
          Novo Coordenador
        </Button>
      </div>

      {coordenadores.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground">
          <p>Nenhum coordenador cadastrado</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {coordenadores.map((coordenador) => (
            <Card key={coordenador.id} className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-normal">{coordenador.nome}</h3>
                    <Badge variant={coordenador.ativo ? "default" : "secondary"}>
                      {coordenador.ativo ? (
                        <>
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Ativo
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3 mr-1" />
                          Inativo
                        </>
                      )}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{coordenador.descricao}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleAtivo(coordenador)}
                  >
                    {coordenador.ativo ? "Desativar" : "Ativar"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(coordenador)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(coordenador.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Editar Coordenador" : "Novo Coordenador"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nome</Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Coordenador de Sistemas para Internet"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Input
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Ex: Coordenador do curso de Sistemas para Internet"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancelar
            </Button>
            <Button onClick={handleSave} variant="elegant">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

