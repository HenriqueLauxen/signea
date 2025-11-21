import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex h-9 w-16 items-center rounded-full border border-border bg-muted transition-colors hover:bg-accent cursor-pointer"
      aria-label="Toggle theme"
    >
      <span
        className={`inline-flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-background transition-transform ${
          theme === "dark" ? "translate-x-1" : "translate-x-8"
        }`}
      >
        {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      </span>
    </button>
  );
}
