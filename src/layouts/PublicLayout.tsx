import { ReactNode } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";

type PublicLayoutProps = {
  children: ReactNode;
};

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="px-6 py-4 flex justify-between items-center">
          <h1 className="text-xl font-light tracking-wider">SIGNEA</h1>
          <ThemeToggle />
        </div>
      </header>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}
