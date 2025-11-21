import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProfile, Profile } from "@/contexts/ProfileContext";
import { ChevronDown, Lock, User, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { modal } from "@/contexts/ModalContext";

const profileLabels: Record<Profile, string> = {
  user: "Aluno",
  organizer: "Organizador",
  campus: "Admin",
};

const profileRoutes: Record<Profile, string> = {
  user: "/usuario/eventos",
  organizer: "/organizador/eventos",
  campus: "/campus/visao-geral",
};

const profileOrder: Profile[] = ["user", "organizer", "campus"];

export function ProfileHeader() {
  const navigate = useNavigate();
  const { currentProfile, setProfile, hasPermission } = useProfile();
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    const getUserData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user?.email) {
          const userEmail = session.user.email;
          setEmail(userEmail);

          // Busca dados do usuário
          const { data: userData } = await supabase
            .from('usuarios')
            .select('nome_completo, avatar_url')
            .eq('email', userEmail)
            .single();

          if (userData) {
            if (userData.nome_completo) setNome(userData.nome_completo);
            if (userData.avatar_url) setAvatarUrl(userData.avatar_url);
          }
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
      }
    };

    getUserData();

    // Escuta mudanças na tabela usuarios em tempo real
    const channel = supabase
      .channel('usuarios-header-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'usuarios'
        },
        (payload) => {
          console.log('Mudança detectada:', payload);
          getUserData(); // Recarrega os dados
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        modal.error("Erro ao sair");
      } else {
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        modal.success("Logout realizado com sucesso!");
        navigate("/");
      }
    } catch (err) {
      modal.error("Erro ao sair. Tente novamente.");
    }
  };

  const handleProfileChange = (profile: Profile) => {
    setProfile(profile);
    navigate(profileRoutes[profile]);
  };

  const handlePerfilClick = () => {
    const perfilRoutes: Record<Profile, string> = {
      user: "/usuario/perfil",
      organizer: "/organizador/eventos",
      campus: "/campus/configuracoes",
    };
    navigate(perfilRoutes[currentProfile]);
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
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-light tracking-wider">SIGNEA</h1>

        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                {profileLabels[currentProfile]}
                <ChevronDown className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Mudar Perfil</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {profileOrder.map((profile) => {
                const isLocked = !hasPermission(profile);
                return (
                  <DropdownMenuItem
                    key={profile}
                    disabled={isLocked}
                    onClick={() => handleProfileChange(profile)}
                    className="gap-2"
                  >
                    {isLocked && <Lock className="w-4 h-4 text-muted-foreground" />}
                    {profileLabels[profile]}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage 
                    src={avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`}
                    alt={nome || email}
                    className="object-cover"
                  />
                  <AvatarFallback>{getInitials()}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{nome || email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handlePerfilClick}>
                <User className="w-4 h-4 mr-2" />
                Meu Perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="w-4 h-4 mr-2" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
