import React, { useState, useEffect } from "react";
import { NavLink } from "@/components/NavLink";
import {
  Building,
  Calendar,
  Users,
  UserCog,
  LayoutDashboard,
  FileText,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useSidebarMinimized } from "@/hooks/useSidebarMinimized";

const menuItems = [
  { icon: LayoutDashboard, label: "Visão Geral", path: "/campus/visao-geral" },
  { icon: Calendar, label: "Eventos", path: "/campus/eventos" },
  { icon: Users, label: "Usuários", path: "/campus/usuarios" },
  { icon: FileText, label: "Certificados", path: "/campus/certificados" },
  { path: "/campus/coordenadores", label: "Coordenadores", icon: UserCog },
];

const perfilOptions = [
  { key: "usuario", label: "Aluno" },
  { key: "organizador", label: "Organizador" },
  { key: "campus", label: "Admin" },
];

export function CampusSidebar() {
  const { minimizado, toggleMinimizado } = useSidebarMinimized();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [canShow, setCanShow] = useState(false);
  useEffect(() => {
    (async () => {
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      setUserEmail(session?.user?.email || null);
    })();
  }, []);
  useEffect(() => {
    if (userEmail) {
      import("@/lib/menuPermissions").then(({ getUserMenuPermissions }) => {
        const perms = getUserMenuPermissions(userEmail);
        setCanShow(perms.campus);
      });
    }
  }, [userEmail]);
  if (!canShow) return null;
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
              Menu Campus
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

export function PerfilDropdownMenu({ userEmail }: { userEmail: string }) {
  const [perms, setPerms] = useState<{ usuario: boolean; organizador: boolean; campus: boolean }>({
    usuario: false,
    organizador: false,
    campus: false,
  });

  useEffect(() => {
    import("@/lib/menuPermissions").then(({ getUserMenuPermissions }) => {
      setPerms(getUserMenuPermissions(userEmail));
    });
  }, [userEmail]);

  // Só renderiza se tiver pelo menos uma permissão
  const hasAnyPerm = perms.usuario || perms.organizador || perms.campus;
  if (!hasAnyPerm) return null;

  return (
    <div>
      <div className="px-2 py-1.5 text-sm font-semibold">Mudar Perfil</div>
      <div role="separator" aria-orientation="horizontal" className="-mx-1 my-1 h-px bg-muted"></div>
      {perfilOptions.map(opt =>
        perms[opt.key] ? (
          <div
            key={opt.key}
            role="menuitem"
            className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground gap-2"
            tabIndex={-1}
            data-orientation="vertical"
            data-radix-collection-item=""
          >
            {opt.label}
          </div>
        ) : null
      )}
    </div>
  );
}
