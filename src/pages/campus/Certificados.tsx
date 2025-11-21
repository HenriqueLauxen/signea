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
import { useState } from "react";
import { Search, Download, Calendar, User, FileText } from "lucide-react";

const mockCertificados = [
  {
    id: 1,
    hash: "a1b2c3d4e5f6",
    aluno: "João Silva",
    evento: "Semana de Tecnologia 2025",
    dataEmissao: "16/01/2025",
    cargaHoraria: 40,
  },
  {
    id: 2,
    hash: "x9y8z7w6v5u4",
    aluno: "Maria Santos",
    evento: "Workshop de React",
    dataEmissao: "05/02/2025",
    cargaHoraria: 8,
  },
  {
    id: 3,
    hash: "m1n2o3p4q5r6",
    aluno: "Ana Costa",
    evento: "Hackathon 2024",
    dataEmissao: "12/12/2024",
    cargaHoraria: 24,
  },
];

export default function Certificados() {
  const [busca, setBusca] = useState("");

  const certificadosFiltrados = mockCertificados.filter(
    (cert) =>
      busca === "" ||
      cert.aluno.toLowerCase().includes(busca.toLowerCase()) ||
      cert.evento.toLowerCase().includes(busca.toLowerCase()) ||
      cert.hash.includes(busca)
  );

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
                {certificadosFiltrados.map((cert) => (
                  <TableRow key={cert.id}>
                    <TableCell className="font-mono text-sm">{cert.hash}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        {cert.aluno}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        {cert.evento}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        {cert.dataEmissao}
                      </div>
                    </TableCell>
                    <TableCell>{cert.cargaHoraria}h</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Baixar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>
    </div>
  );
}
