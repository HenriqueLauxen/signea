import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Save, Eye, EyeOff, Lock, Pencil, GraduationCap, MapPin } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
// import { modal } from "@/contexts/ModalContext"; // Removed modal usage
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

interface Campus {
  id: number;
  nome: string;
}

interface Curso {
  id: number;
  nome: string;
}

export default function Perfil() {
  const toast = useToast();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);

  // Dados Acadêmicos
  const [cursoNome, setCursoNome] = useState<string>("Não informado");
  const [campusNome, setCampusNome] = useState<string>("Não informado");
  const [campusId, setCampusId] = useState<number | null>(null);
  const [cursoId, setCursoId] = useState<number | null>(null);

  // Listas para Selects
  const [listaCampus, setListaCampus] = useState<Campus[]>([]);
  const [listaCursos, setListaCursos] = useState<Curso[]>([]);

  // Modais
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showEditAcademicModal, setShowEditAcademicModal] = useState(false);
  const [tempNome, setTempNome] = useState("");
  const [tempCampusId, setTempCampusId] = useState<string>("");
  const [tempCursoId, setTempCursoId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getUserData = async () => {
      try {
        setLoading(true);
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro de sessão:", error);
          toast.error("Erro ao carregar sessão");
          return;
        }

        if (session?.user?.email) {
          const userEmail = session.user.email;
          setEmail(userEmail);

          // Busca dados com relacionamentos
          // Usando left join para evitar erros se não tiver curso/campus
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select(`
              *,
              cursos:curso_id(id, nome),
              campus:campus_id(id, nome)
            `)
            .eq('email', userEmail)
            .single();

          if (userError) {
            console.error("Erro ao buscar dados do usuário:", userError);
            // Tenta buscar sem os joins se falhar
            const { data: simpleData, error: simpleError } = await supabase
              .from('usuarios')
              .select('*')
              .eq('email', userEmail)
              .single();

            if (!simpleError && simpleData) {
              if (simpleData.nome_completo) setNome(simpleData.nome_completo);
              if (simpleData.matricula) setMatricula(simpleData.matricula);
              if (simpleData.avatar_url) setAvatarUrl(simpleData.avatar_url);
            }
          } else if (userData) {
            if (userData.nome_completo) setNome(userData.nome_completo);
            if (userData.matricula) setMatricula(userData.matricula);
            if (userData.avatar_url) setAvatarUrl(userData.avatar_url);

            // Buscar dados do curso
            if (userData.cursos) {
              const curso = Array.isArray(userData.cursos) ? userData.cursos[0] : userData.cursos;
              if (curso) {
                setCursoNome(curso.nome);
                setCursoId(curso.id);
              }
            }

            // Buscar dados do campus
            if (userData.campus) {
              const campus = Array.isArray(userData.campus) ? userData.campus[0] : userData.campus;
              if (campus) {
                setCampusNome(campus.nome);
                setCampusId(campus.id);
              }
            }
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      } finally {
        setLoading(false);
      }
    };

    getUserData();
    fetchCampusAndCursos();
  }, []);

  const fetchCampusAndCursos = async () => {
    const { data: campusData } = await supabase.from('campus').select('id, nome').order('nome');
    if (campusData) setListaCampus(campusData);

    const { data: cursosData } = await supabase.from('cursos').select('id, nome').order('nome');
    if (cursosData) setListaCursos(cursosData);
  };

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    setUploadingPhoto(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${matricula}-${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('perfil')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('perfil')
        .getPublicUrl(filePath);

      // Atualiza no banco
      const { error: updateError } = await supabase
        .from('usuarios')
        .update({ avatar_url: publicUrl })
        .eq('email', email);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast.success("Foto alterada com sucesso!");
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      toast.error(error.message || "Erro ao alterar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleOpenEditName = () => {
    setTempNome(nome);
    setShowEditNameModal(true);
  };

  const handleSaveName = async () => {
    if (!tempNome.trim()) {
      toast.error("O nome não pode estar vazio");
      return;
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nome_completo: tempNome })
        .eq('email', email);

      if (error) throw error;

      setNome(tempNome);
      toast.success("Nome atualizado com sucesso!");
      setShowEditNameModal(false);
    } catch (error: any) {
      console.error("Erro ao salvar nome:", error);
      toast.error("Erro ao atualizar nome");
    }
  };

  const handleOpenEditAcademic = () => {
    setTempCampusId(campusId?.toString() || "");
    setTempCursoId(cursoId?.toString() || "");
    setShowEditAcademicModal(true);
  };

  const handleSaveAcademic = async () => {
    try {
      const updates: any = {};
      if (tempCampusId) updates.campus_id = parseInt(tempCampusId);
      if (tempCursoId) updates.curso_id = parseInt(tempCursoId);

      const { error } = await supabase
        .from('usuarios')
        .update(updates)
        .eq('email', email);

      if (error) throw error;

      // Atualiza estado local
      if (tempCampusId) {
        const campus = listaCampus.find(c => c.id === parseInt(tempCampusId));
        if (campus) {
          setCampusNome(campus.nome);
          setCampusId(campus.id);
        }
      }

      if (tempCursoId) {
        const curso = listaCursos.find(c => c.id === parseInt(tempCursoId));
        if (curso) {
          setCursoNome(curso.nome);
          setCursoId(curso.id);
        }
      }

      toast.success("Dados acadêmicos atualizados!");
      setShowEditAcademicModal(false);
    } catch (error: any) {
      console.error("Erro ao salvar dados acadêmicos:", error);
      toast.error("Erro ao atualizar dados");
    }
  };

  const handleAlterarSenha = async () => {
    if (!senhaAtual || !novaSenha) {
      toast.error("Preencha todos os campos de senha");
      return;
    }

    if (novaSenha.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem");
      return;
    }

    try {
      setAlterandoSenha(true);

      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: email,
        password: senhaAtual,
      });

      if (reauthError) {
        toast.error("Senha atual incorreta");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) throw updateError;

      toast.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      toast.error(error.message || "Erro ao alterar senha");
    } finally {
      setAlterandoSenha(false);
    }
  };

  const getInitials = () => {
    if (!nome) return email.charAt(0).toUpperCase();
    return nome
      .split(' ')
      .map(n => n.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-light">Meu Perfil</h1>

      <Card className="p-8">
        <div className="flex flex-col items-center gap-6 mb-8">
          <Avatar className="w-32 h-32">
            <AvatarImage
              src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`}
              className="object-cover"
            />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handlePhotoClick}
            disabled={uploadingPhoto}
          >
            <Upload className="w-4 h-4 mr-2" />
            {uploadingPhoto ? "Enviando..." : "Alterar Foto"}
          </Button>
        </div>

        <div className="space-y-6">
          {/* Nome Completo */}
          <div className="space-y-2">
            <Label>Nome Completo</Label>
            <div className="flex gap-2">
              <Input value={nome} disabled className="bg-muted/50" />
              <Button variant="outline" size="icon" onClick={handleOpenEditName}>
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* E-mail e Matrícula */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail Institucional</Label>
              <Input value={email} disabled className="bg-muted/50" />
            </div>
            <div className="space-y-2">
              <Label>Matrícula</Label>
              <Input value={matricula} disabled className="bg-muted/50" />
            </div>
          </div>

          {/* Campus e Curso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Campus
              </Label>
              <div className="flex gap-2">
                <Input value={campusNome} disabled className="bg-muted/50" />
                <Button variant="outline" size="icon" onClick={handleOpenEditAcademic}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" /> Curso
              </Label>
              <div className="flex gap-2">
                <Input value={cursoNome} disabled className="bg-muted/50" />
                <Button variant="outline" size="icon" onClick={handleOpenEditAcademic}>
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Seção de Senha */}
      <Card className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Lock className="w-5 h-5" />
          <h2 className="text-xl font-light">Alterar Senha</h2>
        </div>

        <div className="space-y-4">
          <div>
            <Label>Senha Atual</Label>
            <div className="relative">
              <Input
                type={mostrarSenhaAtual ? "text" : "password"}
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                placeholder="Digite sua senha atual"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setMostrarSenhaAtual(!mostrarSenhaAtual)}
              >
                {mostrarSenhaAtual ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Nova Senha</Label>
            <div className="relative">
              <Input
                type={mostrarNovaSenha ? "text" : "password"}
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                placeholder="Digite sua nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setMostrarNovaSenha(!mostrarNovaSenha)}
              >
                {mostrarNovaSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div>
            <Label>Confirmar Nova Senha</Label>
            <div className="relative">
              <Input
                type={mostrarConfirmarSenha ? "text" : "password"}
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Confirme sua nova senha"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              >
                {mostrarConfirmarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <Button
            variant="elegant"
            onClick={handleAlterarSenha}
            disabled={alterandoSenha}
            className="w-full"
          >
            {alterandoSenha ? "Alterando..." : "Alterar Senha"}
          </Button>
        </div>
      </Card>

      {/* Modal Editar Nome */}
      <Dialog open={showEditNameModal} onOpenChange={setShowEditNameModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Nome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={tempNome}
                onChange={(e) => setTempNome(e.target.value)}
                placeholder="Digite seu nome completo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditNameModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveName}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Dados Acadêmicos */}
      <Dialog open={showEditAcademicModal} onOpenChange={setShowEditAcademicModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dados Acadêmicos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Campus</Label>
              <Select value={tempCampusId} onValueChange={setTempCampusId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu campus" />
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
              <Select value={tempCursoId} onValueChange={setTempCursoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione seu curso" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditAcademicModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveAcademic}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
