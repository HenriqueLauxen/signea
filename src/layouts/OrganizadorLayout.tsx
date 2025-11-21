import { ReactNode } from "react";
import { OrganizadorSidebar } from "@/components/sidebars/OrganizadorSidebar";
import { ProfileHeader } from "@/components/headers/ProfileHeader";

type OrganizadorLayoutProps = {
  children: ReactNode;
};

export function OrganizadorLayout({ children }: OrganizadorLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <OrganizadorSidebar />
      <div className="flex-1 flex flex-col">
        <ProfileHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
