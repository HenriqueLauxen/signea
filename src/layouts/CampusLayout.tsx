import { ReactNode } from "react";
import { CampusSidebar } from "@/components/sidebars/CampusSidebar";
import { ProfileHeader } from "@/components/headers/ProfileHeader";

type CampusLayoutProps = {
  children: ReactNode;
};

export function CampusLayout({ children }: CampusLayoutProps) {
  return (
    <div className="min-h-screen flex w-full bg-background">
      <CampusSidebar />
      <div className="flex-1 flex flex-col">
        <ProfileHeader />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
