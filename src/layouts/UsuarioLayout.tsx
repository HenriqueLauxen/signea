import { ReactNode } from "react";
import { UsuarioSidebar } from "@/components/sidebars/UsuarioSidebar";
import { ProfileHeader } from "@/components/headers/ProfileHeader";

type UsuarioLayoutProps = {
  children: ReactNode;
};

export function UsuarioLayout({ children }: UsuarioLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <UsuarioSidebar />
      <div className="flex-1 flex flex-col">
        <ProfileHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
