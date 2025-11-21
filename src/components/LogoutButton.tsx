import { useNavigate } from "react-router-dom";
import { modal } from "@/contexts/ModalContext";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/sessionManager";

export const LogoutButton = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      modal.success("Logout realizado com sucesso!");
      navigate("/login");
    } catch (err) {
      modal.error("Erro ao sair. Tente novamente.");
    }
  };

  return (
    <Button onClick={handleLogout} variant="outline">
      Sair
    </Button>
  );
};