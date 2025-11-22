import { useState } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Calendar,
  QrCode,
  Award,
  User,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const menuItems = [
  { path: "/usuario/eventos", label: "Eventos", icon: Calendar },
  { path: "/usuario/minhas-solicitacoes", label: "Sugerir evento", icon: Plus },
  { path: "/usuario/registrar-presenca", label: "Registrar Presença", icon: QrCode },
  { path: "/usuario/meus-certificados", label: "Meus Certificados", icon: Award },
  { path: "/usuario/perfil", label: "Perfil", icon: User },
];

export function UsuarioSidebar() {
  const [minimizado, setMinimizado] = useState(false);

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
              Menu Usuário
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
      <div className="p-3 border-t border-border">
        <button
          onClick={() => setMinimizado(!minimizado)}
          className={`w-full flex items-center ${minimizado ? 'justify-center' : 'justify-center gap-2'} px-3 py-2 rounded-lg text-sm transition-colors hover:bg-accent hover:text-accent-foreground text-muted-foreground`}
          title={minimizado ? "Maximizar" : "Minimizar"}
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
