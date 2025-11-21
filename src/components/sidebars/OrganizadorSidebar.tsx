import { NavLink } from "@/components/NavLink";
import {
  Calendar,
  CalendarDays,
  Users,
  CheckCircle,
  DollarSign,
  Award,
  FileCheck,
} from "lucide-react";

const menuItems = [
  { path: "/organizador/eventos", label: "Eventos", icon: Calendar },
  { path: "/organizador/aprovar-eventos", label: "Aprovar Eventos", icon: FileCheck },
  { path: "/organizador/dias-qrcodes", label: "Histórico de QRCodes e Palavras Chaves", icon: CalendarDays },
  { path: "/organizador/inscricoes", label: "Inscrições", icon: Users },
  { path: "/organizador/presencas", label: "Presenças", icon: CheckCircle },
  { path: "/organizador/pagamentos", label: "Pagamentos", icon: DollarSign },
  { path: "/organizador/certificados", label: "Certificados", icon: Award },
];

export function OrganizadorSidebar() {
  return (
    <aside className="w-64 border-r border-border bg-card/30 backdrop-blur-sm flex flex-col">
      <div className="p-6">
        <h2 className="text-sm font-light text-muted-foreground uppercase tracking-wider">
          Menu Organizador
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
