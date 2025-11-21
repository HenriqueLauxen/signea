import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Save, Eye, EyeOff, Lock } from "lucide-react";
import { modal } from "@/contexts/ModalContext";
import { supabase } from "@/lib/supabase";

export default function Perfil() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [matricula, setMatricula] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenhaAtual, setMostrarSenhaAtual] = useState(false);
  const [mostrarNovaSenha, setMostrarNovaSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [alterandoSenha, setAlterandoSenha] = useState(false);
  const [cursoNome, setCursoNome] = useState<string | null>(null);
  const [campusNome, setCampusNome] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          modal.error("Erro ao carregar dados do usuário");
          return;
        }

        if (session?.user?.email) {
          const userEmail = session.user.email;
          setEmail(userEmail);

          const matriculaExtraida = userEmail.split('@')[0];
          setMatricula(matriculaExtraida);

          // Busca dados com relacionamentos
          const { data: userData, error: userError } = await supabase
            .from('usuarios')
            .select(`
              *,
              cursos:curso_id(id, nome),
              campus:campus_id(id, nome)
            `)
            .eq('email', userEmail)
            .single();

          console.log('Dados do usuário:', userData);
          console.log('Erro:', userError);

          if (!userError && userData) {
            if (userData.nome_completo) setNome(userData.nome_completo);
            if (userData.avatar_url) setAvatarUrl(userData.avatar_url);
            
            // Buscar nome do curso
            if (userData.cursos) {
              const curso = Array.isArray(userData.cursos) ? userData.cursos[0] : userData.cursos;
              if (curso && typeof curso === 'object' && 'nome' in curso) {
                setCursoNome(curso.nome as string);
              }
            }
            
            // Buscar nome do campus
            if (userData.campus) {
              const campus = Array.isArray(userData.campus) ? userData.campus[0] : userData.campus;
              if (campus && typeof campus === 'object' && 'nome' in campus) {
                setCampusNome(campus.nome as string);
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
  }, []);

  const handlePhotoClick = () => {
    fileInputRef.current?.click();
  };

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      modal.error("Por favor, selecione uma imagem");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      modal.error("A imagem deve ter no máximo 2MB");
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

      if (uploadError) {
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('perfil')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
      modal.success("Foto alterada com sucesso!");
    } catch (error: any) {
      console.error('Erro ao fazer upload:', error);
      modal.error(error.message || "Erro ao alterar foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      modal.error("Por favor, preencha seu nome");
      return;
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .upsert({
          email: email,
          nome_completo: nome,
          avatar_url: avatarUrl || null
        }, {
          onConflict: 'email'
        });

      if (error) {
        console.error('Erro detalhado:', error);
        throw error;
      }

      modal.success("Perfil atualizado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao salvar:", error);
      modal.error(error.message || "Erro ao salvar alterações");
    }
  };

  const handleAlterarSenha = async () => {
    if (!senhaAtual) {
      modal.error("Digite sua senha atual");
      return;
    }

    if (!novaSenha) {
      modal.error("Digite a nova senha");
      return;
    }

    if (novaSenha.length < 6) {
      modal.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      modal.error("As senhas não coincidem");
      return;
    }

    try {
      setAlterandoSenha(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.email) {
        modal.error("Você precisa estar logado");
        return;
      }

      // Tentar reautenticar com a senha atual primeiro
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: senhaAtual,
      });

      if (reauthError) {
        modal.error("Senha atual incorreta");
        return;
      }

      // Se reautenticou, atualizar senha
      const { error: updateError } = await supabase.auth.updateUser({
        password: novaSenha
      });

      if (updateError) {
        throw updateError;
      }

      modal.success("Senha alterada com sucesso!");
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmarSenha("");
    } catch (error: any) {
      console.error("Erro ao alterar senha:", error);
      modal.error(error.message || "Erro ao alterar senha");
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

        <div className="space-y-4">
          <div>
            <Label>Nome Completo</Label>
            <Input 
              value={nome} 
              onChange={(e) => setNome(e.target.value)}
              placeholder="Digite seu nome completo"
            />
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
                {mostrarSenhaAtual ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
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
                {mostrarNovaSenha ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
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
                {mostrarConfirmarSenha ? (
                  <EyeOff className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <Eye className="w-4 h-4 text-muted-foreground" />
                )}
              </Button>
            </div>
          </div>

          <Button
            variant="elegant"
            onClick={handleAlterarSenha}
            disabled={alterandoSenha}
            className="w-full"
          >
            {alterandoSenha ? (
              "Alterando..."
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Alterar Senha
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
}
