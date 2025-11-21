import { NavLink } from "@/components/NavLink";
import {
  Building,
  Calendar,
  Users,
  Award,
  ShieldCheck,
  Settings,
  UserCog,
} from "lucide-react";

const menuItems = [
  { path: "/campus/visao-geral", label: "Visão Geral", icon: Building },
  { path: "/campus/eventos", label: "Eventos do Campus", icon: Calendar },
  { path: "/campus/usuarios", label: "Usuários", icon: Users },
  { path: "/campus/certificados", label: "Certificados", icon: Award },
  { path: "/campus/auditoria", label: "Auditoria", icon: ShieldCheck },
  { path: "/campus/coordenadores", label: "Coordenadores", icon: UserCog },
  { path: "/campus/configuracoes", label: "Configurações", icon: Settings },
];

export function CampusSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-light text-muted-foreground uppercase tracking-wider">
          Menu Campus
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
