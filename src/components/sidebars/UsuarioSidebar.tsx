import { NavLink } from "@/components/NavLink";
import {
  Calendar,
  QrCode,
  Award,
  User,
  Plus,
} from "lucide-react";

const menuItems = [
  { path: "/usuario/eventos", label: "Eventos", icon: Calendar },
  { path: "/usuario/minhas-solicitacoes", label: "Criar evento", icon: Plus },
  { path: "/usuario/registrar-presenca", label: "Registrar Presença", icon: QrCode },
  { path: "/usuario/meus-certificados", label: "Meus Certificados", icon: Award },
  { path: "/usuario/perfil", label: "Perfil", icon: User },
];

export function UsuarioSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-light text-muted-foreground uppercase tracking-wider">
          Menu Usuário
        </h2>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
              activeClassName="bg-muted text-primary font-medium"
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
