import { NavLink } from "@/components/NavLink";
import {
  Calendar,
  CalendarDays,
  Users,
  CheckCircle,
  DollarSign,
  Award,
  FileCheck,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSidebarMinimized } from "@/hooks/useSidebarMinimized";

const menuItems = [
  { path: "/organizador/eventos", label: "Eventos", icon: Calendar },
  { path: "/organizador/aprovar-eventos", label: "Aprovar Eventos", icon: FileCheck },
  { path: "/organizador/dias-qrcodes", label: "Histórico de QRCodes e Palavras Chaves", icon: CalendarDays },
  { path: "/organizador/inscricoes", label: "Inscrições", icon: Users },
  { path: "/organizador/presencas", label: "Presenças", icon: CheckCircle },
  { path: "/organizador/pagamentos", label: "Pagamentos", icon: DollarSign },
  { path: "/organizador/certificados", label: "Certificados", icon: Award },
  { path: "/organizador/perfil", label: "Meu Perfil", icon: User },
];

export function OrganizadorSidebar() {
  const { minimizado, toggleMinimizado } = useSidebarMinimized();

  return (
    <aside className={`${minimizado ? 'w-16' : 'w-64'} border-r border-border bg-card/30 backdrop-blur-sm flex flex-col transition-all duration-300 relative`}>
      <div className={`${minimizado ? 'p-4' : 'p-6'} flex items-center gap-3`}>
        {!minimizado && (
          <>
            <img
              src="/logo-bgremoved.png"
              alt="Logo"
              className="w-12 h-12 object-contain"
            />
            <h2 className="text-sm font-light text-muted-foreground uppercase tracking-wider">
              Menu Organizador
            </h2>
          </>
        )}
        {minimizado && (
          <img
            src="/logo-bgremoved.png"
            alt="Logo"
            className="w-12 h-12 object-contain mx-auto"
          />
        )}
      </div>
      <nav className="flex-1 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`flex items-center ${minimizado ? 'justify-center' : 'gap-3'} px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground`}
              activeClassName="bg-muted text-primary font-medium"
              title={minimizado ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!minimizado && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border flex-shrink-0">
        <button
          onClick={toggleMinimizado}
          className={`w-full flex items-center ${minimizado ? 'justify-center' : 'justify-center gap-2'} px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground z-10 relative`}
          title={minimizado ? "Maximizar" : "Minimizar"}
          aria-label={minimizado ? "Maximizar menu" : "Minimizar menu"}
        >
          {minimizado ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </button>
      </div>
    </aside>
  );
}
