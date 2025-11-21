import { ModalProvider, ModalListener } from "@/contexts/ModalContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/hooks/use-theme";
import { ProfileProvider } from "@/contexts/ProfileContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { UsuarioLayout } from "@/layouts/UsuarioLayout";
import { OrganizadorLayout } from "@/layouts/OrganizadorLayout";
import { CampusLayout } from "@/layouts/CampusLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import ConfirmarCodigo from "./pages/ConfirmarCodigo";
import ConfirmarEmail from "./pages/ConfirmarEmail";
import ValidateAttendance from "./pages/ValidateAttendance";
import ValidateCertificate from "./pages/ValidateCertificate";
import CertificadoView from "./pages/CertificadoView";
import NotFound from "./pages/NotFound";

// Usuario Pages
import Eventos from "./pages/usuario/Eventos";
import RegistrarPresenca from "./pages/usuario/RegistrarPresenca";
import Certificados from "./pages/usuario/Certificados";
import Perfil from "./pages/usuario/Perfil";
import MinhasSolicitacoes from "./pages/usuario/MinhasSolicitacoes";

// Organizador Pages
import MeusEventos from "./pages/organizador/MeusEventos";
import CriarEvento from "./pages/organizador/CriarEvento";
import EventoDetalhes from "./pages/organizador/EventoDetalhes";
import DiasQRCodes from "./pages/organizador/DiasQRCodes";
import InscricoesOrg from "./pages/organizador/Inscricoes";
import PresencasOrg from "./pages/organizador/Presencas";
import PagamentosOrg from "./pages/organizador/Pagamentos";
import CertificadosOrg from "./pages/organizador/Certificados";
import RelatoriosOrg from "./pages/organizador/Relatorios";
import AprovarEventos from "./pages/organizador/AprovarEventos";


// Campus Pages
import VisaoGeral from "./pages/campus/VisaoGeral";
import EventosCampus from "./pages/campus/Eventos";
import UsuariosCampus from "./pages/campus/Usuarios";
import CertificadosCampus from "./pages/campus/Certificados";
import Auditoria from "./pages/campus/Auditoria";
import Configuracoes from "./pages/campus/Configuracoes";
import Coordenadores from "./pages/campus/Coordenadores";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <ProfileProvider>
          <ToastProvider>
            <ModalProvider>
              <ModalListener />
              <TooltipProvider>
            <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/cadastro" element={<Cadastro />} />
              <Route path="/confirmar-codigo" element={<ConfirmarCodigo />} />
              <Route path="/confirmar-email" element={<ConfirmarEmail />} />
              <Route path="/validar-presenca" element={<PublicLayout><ValidateAttendance /></PublicLayout>} />
              <Route path="/validar-certificado" element={<PublicLayout><ValidateCertificate /></PublicLayout>} />
              <Route path="/certificado/:sha256" element={<PublicLayout><CertificadoView /></PublicLayout>} />
              <Route path="/certificados/:sha256" element={<PublicLayout><ValidateCertificate /></PublicLayout>} />
              
              {/* Usuario Routes */}
              <Route path="/usuario" element={<ProtectedRoute><Navigate to="/usuario/eventos" replace /></ProtectedRoute>} />
              <Route path="/usuario/eventos" element={<ProtectedRoute><UsuarioLayout><Eventos /></UsuarioLayout></ProtectedRoute>} />
              <Route path="/usuario/registrar-presenca" element={<ProtectedRoute><UsuarioLayout><RegistrarPresenca /></UsuarioLayout></ProtectedRoute>} />
              <Route path="/usuario/meus-certificados" element={<ProtectedRoute><UsuarioLayout><Certificados /></UsuarioLayout></ProtectedRoute>} />
              <Route path="/usuario/perfil" element={<ProtectedRoute><UsuarioLayout><Perfil /></UsuarioLayout></ProtectedRoute>} />
              <Route path="/usuario/minhas-solicitacoes" element={<ProtectedRoute><UsuarioLayout><MinhasSolicitacoes /></UsuarioLayout></ProtectedRoute>} />
              
              {/* Organizador Routes */}
              <Route path="/organizador" element={<ProtectedRoute><Navigate to="/organizador/eventos" replace /></ProtectedRoute>} />
              <Route path="/organizador/eventos" element={<ProtectedRoute><OrganizadorLayout><MeusEventos /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/criar-evento" element={<ProtectedRoute><OrganizadorLayout><CriarEvento /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/evento/:id" element={<ProtectedRoute><OrganizadorLayout><EventoDetalhes /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/dias-qrcodes" element={<ProtectedRoute><OrganizadorLayout><DiasQRCodes /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/inscricoes" element={<ProtectedRoute><OrganizadorLayout><InscricoesOrg /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/presencas" element={<ProtectedRoute><OrganizadorLayout><PresencasOrg /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/pagamentos" element={<ProtectedRoute><OrganizadorLayout><PagamentosOrg /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/certificados" element={<ProtectedRoute><OrganizadorLayout><CertificadosOrg /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/relatorios" element={<ProtectedRoute><OrganizadorLayout><RelatoriosOrg /></OrganizadorLayout></ProtectedRoute>} />
              <Route path="/organizador/aprovar-eventos" element={<ProtectedRoute><OrganizadorLayout><AprovarEventos /></OrganizadorLayout></ProtectedRoute>} />
              
              
              {/* Campus Routes */}
              <Route path="/campus" element={<ProtectedRoute><Navigate to="/campus/visao-geral" replace /></ProtectedRoute>} />
              <Route path="/campus/visao-geral" element={<ProtectedRoute><CampusLayout><VisaoGeral /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/eventos" element={<ProtectedRoute><CampusLayout><EventosCampus /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/usuarios" element={<ProtectedRoute><CampusLayout><UsuariosCampus /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/certificados" element={<ProtectedRoute><CampusLayout><CertificadosCampus /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/auditoria" element={<ProtectedRoute><CampusLayout><Auditoria /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/configuracoes" element={<ProtectedRoute><CampusLayout><Configuracoes /></CampusLayout></ProtectedRoute>} />
              <Route path="/campus/coordenadores" element={<ProtectedRoute><CampusLayout><Coordenadores /></CampusLayout></ProtectedRoute>} />
              
              {/* Legacy routes - redirect to new structure */}
              <Route path="/dashboard/*" element={<ProtectedRoute><Navigate to="/usuario/eventos" replace /></ProtectedRoute>} />
              <Route path="/aluno" element={<ProtectedRoute><Navigate to="/usuario/eventos" replace /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><Navigate to="/organizador/eventos" replace /></ProtectedRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
        </ModalProvider>
        </ToastProvider>
      </ProfileProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
