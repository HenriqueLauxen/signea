import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Search, Loader2, Mail, Pencil } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Usuario {
  id: string;
  nome_completo: string;
  email: string;
  matricula: string;
  tipo: string; // user, organizer, admin
  avatar_url: string | null;
  campus_id: number | null;
  curso_id: number | null;
  campus: { id: number; nome: string } | null;
  cursos: { id: number; nome: string } | null;
}

interface Campus {
  id: number;
  nome: string;
}

interface Curso {
  id: number;
  nome: string;
}

export default function Usuarios() {
  const toast = useToast();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Edit State
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    nome_completo: "",
    email: "",
    matricula: "",
    tipo: "user",
    campus_id: "",
    curso_id: ""
  });

  // Lists
  const [listaCampus, setListaCampus] = useState<Campus[]>([]);
  const [listaCursos, setListaCursos] = useState<Curso[]>([]);

  const carregarUsuarios = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          *,
          campus:campus_id(id, nome),
          cursos:curso_id(id, nome)
        `)
        .order('nome_completo');

      if (error) throw error;

      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    const { data: campusData } = await supabase.from('campus').select('id, nome').order('nome');
    if (campusData) setListaCampus(campusData);

    const { data: cursosData } = await supabase.from('cursos').select('id, nome').order('nome');
    if (cursosData) setListaCursos(cursosData);
  };

  useEffect(() => {
    carregarUsuarios();
    fetchLists();
  }, []);

  const handleEdit = (user: Usuario) => {
    setEditingUser(user);
    setFormData({
      nome_completo: user.nome_completo || "",
      email: user.email || "",
      matricula: user.matricula || "",
      tipo: user.tipo || "user",
      campus_id: user.campus_id?.toString() || "",
      curso_id: user.curso_id?.toString() || ""
    });
    setShowEditModal(true);
  };

  const handleSave = async () => {
    if (!editingUser) return;

    try {
      setSaving(true);

      const updates: any = {
        nome_completo: formData.nome_completo,
        email: formData.email,
        matricula: formData.matricula,
        tipo: formData.tipo,
        campus_id: formData.campus_id ? parseInt(formData.campus_id) : null,
        curso_id: formData.curso_id ? parseInt(formData.curso_id) : null
      };

      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('id', editingUser.id);

      if (error) throw error;

      toast.success("Usuário atualizado com sucesso!");
      setShowEditModal(false);
      carregarUsuarios(); // Refresh list
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error);
      toast.error("Erro ao atualizar usuário");
    } finally {
      setSaving(false);
    }
  };

  const getPermissionBadge = (tipo: string) => {
    switch (tipo) {
      case 'admin':
        return <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20">Admin</Badge>;
      case 'organizer':
      case 'organizador':
        return <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20">Organizador</Badge>;
      default:
        return <Badge variant="outline">Usuário</Badge>;
    }
  };

  const getInitials = (nome: string) => {
    if (!nome) return "?";
    return nome
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const filteredUsers = usuarios.filter(user =>
    user.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.matricula?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Gerenciar Usuários</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Gerenciar Usuários</h1>
        <p className="text-muted-foreground">Visualize e gerencie os usuários do sistema</p>
      </div>

      <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 max-w-md">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="Buscar por nome, email ou matrícula..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-none focus:outline-none w-full text-sm"
        />
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Vínculo</TableHead>
              <TableHead>Permissão</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(user.nome_completo)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{user.nome_completo || "Sem nome"}</p>
                        <p className="text-xs text-muted-foreground">Matrícula: {user.matricula || "-"}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                      {user.email}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      {user.campus && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Campus: </span>
                          {user.campus.nome}
                        </div>
                      )}
                      {user.cursos && (
                        <div className="text-sm">
                          <span className="text-muted-foreground">Curso: </span>
                          {user.cursos.nome}
                        </div>
                      )}
                      {!user.campus && !user.cursos && (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getPermissionBadge(user.tipo)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(user)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.nome_completo}
                onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Matrícula</Label>
                <Input
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Perfil</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="organizer">Organizador</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Campus</Label>
                <Select
                  value={formData.campus_id}
                  onValueChange={(value) => setFormData({ ...formData, campus_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listaCampus.map((campus) => (
                      <SelectItem key={campus.id} value={campus.id.toString()}>
                        {campus.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Curso</Label>
                <Select
                  value={formData.curso_id}
                  onValueChange={(value) => setFormData({ ...formData, curso_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {listaCursos.map((curso) => (
                      <SelectItem key={curso.id} value={curso.id.toString()}>
                        {curso.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
