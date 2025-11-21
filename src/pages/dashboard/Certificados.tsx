import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, Award, Eye, CheckCircle, XCircle } from "lucide-react";
import { modal } from "@/contexts/ModalContext";

const mockCertificados = [
  {
    id: 1,
    evento: "Semana de Tecnologia 2025",
    data: "12/01/2025",
    hours: 40,
    hash: "a3f5e9c2b4d1f6e8a9c3b5d7f1e4a8c2",
    elegivel: true,
    presencaPercentual: 100,
  },
  {
    id: 2,
    evento: "Workshop de React",
    data: "05/01/2025",
    hours: 8,
    hash: "b2c4e6f8a1d3e5f7a9c1e3f5a7c9e1f3",
    elegivel: true,
    presencaPercentual: 87.5,
  },
  {
    id: 3,
    evento: "Hackathon 2025",
    data: null,
    hours: 24,
    hash: null,
    elegivel: false,
    presencaPercentual: 50,
  },
];

export default function Certificados() {
  const handleDownload = (id: number) => {
    modal.success("Download do certificado iniciado");
  };

  const copyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    modal.success("Hash copiado!");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-light">Meus Certificados</h1>

      <div className="space-y-4">
        {mockCertificados.map((cert) => (
          <Card key={cert.id} className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-normal">{cert.evento}</h3>
                  {cert.elegivel ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Apto
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" />
                      Não Apto
                    </Badge>
                  )}
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {cert.data && <p>Emitido em {cert.data}</p>}
                  <p>{cert.hours}h de carga horária</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${cert.presencaPercentual}%` }}
                      />
                    </div>
                    <span className="text-xs">{cert.presencaPercentual}% presença</span>
                  </div>
                </div>
                {cert.hash && (
                  <div className="mt-3 p-3 bg-muted rounded-md">
                    <p className="text-xs text-muted-foreground mb-1">Hash SHA-256:</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono flex-1 truncate">{cert.hash}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyHash(cert.hash!)}
                      >
                        Copiar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {cert.elegivel && (
              <div className="flex gap-2">
                <Button variant="elegant" size="sm" onClick={() => handleDownload(cert.id)}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  Visualizar
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
