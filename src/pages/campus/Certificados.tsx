import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Download, Calendar, User, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/contexts/ToastContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Certificado {
  id: string;
  codigo_validacao: string;
  created_at: string;
  usuarios: { nome_completo: string } | null;
  eventos: { titulo: string; carga_horaria: number } | null;
}

export default function Certificados() {
  const toast = useToast();
  const [certificados, setCertificados] = useState<Certificado[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");

  const carregarCertificados = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('certificados')
        .select(`
          id,
          codigo_validacao,
          created_at,
          usuario_nome,
          usuario_email,
          eventos:evento_id(titulo, carga_horaria)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedData = (data || []).map((item: any) => ({
        ...item,
        usuarios: { nome_completo: item.usuario_nome || item.usuario_email },
        eventos: Array.isArray(item.eventos) ? item.eventos[0] : item.eventos,
      }));

      setCertificados(formattedData);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      toast.error('Erro ao carregar certificados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCertificados();
  }, []);

  const certificadosFiltrados = certificados.filter(
    (cert) =>
      busca === "" ||
      cert.usuarios?.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      cert.eventos?.titulo?.toLowerCase().includes(busca.toLowerCase()) ||
      cert.codigo_validacao?.includes(busca)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light">Certificados</h1>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-light tracking-tight">Certificados</h1>
        <p className="text-muted-foreground">Visualize todos os certificados emitidos</p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar por aluno, evento ou hash..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="border border-border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Hash</TableHead>
                  <TableHead>Aluno</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Data de Emissão</TableHead>
                  <TableHead>Carga Horária</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {certificadosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum certificado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  certificadosFiltrados.map((cert) => (
                    <TableRow key={cert.id}>
                      <TableCell className="font-mono text-sm">{cert.codigo_validacao}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          {cert.usuarios?.nome_completo || "Desconhecido"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          {cert.eventos?.titulo || "Evento removido"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(cert.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>{cert.eventos?.carga_horaria || "-"}h</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          <Download className="w-4 h-4 mr-2" />
                          Baixar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
