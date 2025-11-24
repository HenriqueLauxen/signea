import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, QrCode, Users, BarChart, Eye, EyeOff, CheckCircle2, XCircle, Clock, Loader2, Download, Key, RefreshCw, Copy } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import QRCode from "qrcode";
import {
  useEvento,
  useInscricoes,
  usePresencas,
  useCertificados,
  useUpdatePagamento,
  useTogglePresenca
} from "@/hooks/useEventoDetalhes";

export default function EventoDetalhes() {
  const { id } = useParams();
  const toast = useToast();

  // React Query Hooks
  const { data: evento, isLoading: loadingEvento } = useEvento(id);
  const { data: inscricoes = [], isLoading: loadingInscricoes } = useInscricoes(id);
  const { data: presencas = [], isLoading: loadingPresencas } = usePresencas(id);
  const { data: certificados = [], isLoading: loadingCertificados } = useCertificados(id);

  const updatePagamento = useUpdatePagamento();
  const togglePresencaMutation = useTogglePresenca();

  // UI States
  const [showQRModal, setShowQRModal] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [selectedDia, setSelectedDia] = useState<number>(1);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [palavrasChave, setPalavrasChave] = useState<Record<number, { palavra: string; data: string; show: boolean }>>({});
  const [gerandoPalavraChave, setGerandoPalavraChave] = useState<Record<number, boolean>>({});
  // const [statusFilter, setStatusFilter] = useState("todos"); // This state was not used in the original code, keeping it commented out.

  const loading = loadingEvento || loadingInscricoes || loadingPresencas || loadingCertificados;

  const handleGerarQR = async () => {
    if (!evento || !evento.codigo_qrcode) {
      toast.error("Evento não possui código QR Code. Verifique se o evento foi criado corretamente.");
      return;
    }

    try {
      // Gerar QR Code usando o código real do evento (6 dígitos)
      const url = `${window.location.origin}/registrar-presenca/${evento.codigo_qrcode}`;
      const qrCodeDataUrl = await QRCode.toDataURL(url, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      setQrCodeUrl(qrCodeDataUrl);
      setShowQRModal(true);
      toast.success("QR Code gerado com sucesso!");
    } catch (error) {
      console.error('Erro ao gerar QR code:', error);
      toast.error('Erro ao gerar QR code');
    }
  };

  const handleValidarPagamento = async (pagamentoId: string, novoStatus: 'aprovado' | 'rejeitado') => {
    try {
      await updatePagamento.mutateAsync({ id: pagamentoId, status: novoStatus });
      toast.success(`Pagamento ${novoStatus} com sucesso!`);
    } catch (error) {
      console.error('Erro ao atualizar pagamento:', error);
      toast.error('Erro ao atualizar pagamento');
    }
  };

  const handleTogglePresenca = async (email: string, dia: number, nome: string) => {
    try {
      const isPresente = presencas.some(p => p.usuario_email === email && p.dia_evento === dia);
      await togglePresencaMutation.mutateAsync({
        eventoId: id!,
        email,
        dia,
        nome,
        isPresente
      });
    } catch (error) {
      console.error('Erro ao atualizar presença:', error);
      toast.error('Erro ao atualizar presença');
    }
  };

  const handleEmitirCertificados = async () => {
    // Lógica simplificada: emitir para quem tem presença (exemplo)
    // Em um cenário real, validaria % de presença
    toast.success("Funcionalidade de emissão em massa em desenvolvimento");
  };

  const getDiasEvento = () => {
    if (!evento) return [];
    const inicio = new Date(evento.data_inicio);
    const fim = new Date(evento.data_fim);
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Se for mesmo dia, diffDays é 0 ou 1 dependendo da hora, vamos assumir pelo menos 1 dia
    const dias = [];
    for (let i = 0; i <= diffDays; i++) {
      dias.push(i + 1);
    }
    return dias.length > 0 ? dias : [1];
  };

  const isPresente = (email: string, dia: number) => {
    return presencas.some(p => p.usuario_email === email && p.dia_evento === dia);
  };

  // Buscar palavras-chave existentes
  useEffect(() => {
    if (!evento || !id) return;

    const carregarPalavrasChave = async () => {
      try {
        const { data, error } = await supabase
          .from("evento_palavras_chave")
          .select("data_evento, palavra_chave")
          .eq("evento_id", id)
          .order("data_evento", { ascending: true });

        if (error) {
          console.error("Erro ao carregar palavras-chave:", error);
          return;
        }

        if (data) {
          const palavras: Record<number, { palavra: string; data: string; show: boolean }> = {};
          const inicio = new Date(evento.data_inicio);
          
          data.forEach((pc) => {
            const dataPC = new Date(pc.data_evento);
            const diffTime = dataPC.getTime() - inicio.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const dia = diffDays + 1;
            
            palavras[dia] = {
              palavra: pc.palavra_chave,
              data: pc.data_evento,
              show: false
            };
          });

          setPalavrasChave(palavras);
        }
      } catch (error) {
        console.error("Erro ao carregar palavras-chave:", error);
      }
    };

    carregarPalavrasChave();
  }, [evento, id]);

  const getDataDoDia = (dia: number): Date => {
    if (!evento) return new Date();
    const inicio = new Date(evento.data_inicio);
    inicio.setHours(0, 0, 0, 0);
    const dataDia = new Date(inicio);
    dataDia.setDate(inicio.getDate() + (dia - 1));
    return dataDia;
  };

  const gerarPalavraChave = async (dia: number) => {
    if (!evento || !id) return;

    try {
      setGerandoPalavraChave(prev => ({ ...prev, [dia]: true }));
      
      const dataDia = getDataDoDia(dia);
      const dataDiaStr = format(dataDia, "yyyy-MM-dd");

      // Gerar palavra-chave aleatória de 6 caracteres alfanuméricos
      const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let palavra = "";
      for (let i = 0; i < 6; i++) {
        palavra += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
      }

      // Verificar se já existe palavra-chave para este dia
      const { data: existente } = await supabase
        .from("evento_palavras_chave")
        .select("id")
        .eq("evento_id", id)
        .eq("data_evento", dataDiaStr)
        .maybeSingle();

      if (existente) {
        // Atualizar palavra-chave existente
        const { error } = await supabase
          .from("evento_palavras_chave")
          .update({ palavra_chave: palavra })
          .eq("id", existente.id);

        if (error) throw error;
      } else {
        // Criar nova palavra-chave
        const { error } = await supabase
          .from("evento_palavras_chave")
          .insert({
            evento_id: id,
            data_evento: dataDiaStr,
            palavra_chave: palavra
          });

        if (error) throw error;
      }

      // Atualizar estado local
      setPalavrasChave(prev => ({
        ...prev,
        [dia]: {
          palavra,
          data: dataDiaStr,
          show: true
        }
      }));

      toast.success(`Palavra-chave gerada para o Dia ${dia}!`);
    } catch (error) {
      console.error("Erro ao gerar palavra-chave:", error);
      toast.error("Erro ao gerar palavra-chave");
    } finally {
      setGerandoPalavraChave(prev => ({ ...prev, [dia]: false }));
    }
  };

  const copiarPalavraChave = (palavra: string) => {
    navigator.clipboard.writeText(palavra);
    toast.success("Palavra-chave copiada!");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!evento) return <div>Evento não encontrado</div>;

  const dias = getDiasEvento();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-light">{evento.titulo}</h1>
        <Badge>
          {format(new Date(evento.data_inicio), "dd/MM", { locale: ptBR })} - {format(new Date(evento.data_fim), "dd/MM/yyyy", { locale: ptBR })}
        </Badge>
      </div>

      <Tabs defaultValue="presencas" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="presencas">Presenças</TabsTrigger>
          <TabsTrigger value="inscricoes">Inscrições & Pagamentos</TabsTrigger>
          <TabsTrigger value="certificados">Certificados</TabsTrigger>
          <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="presencas" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {dias.map((dia) => (
                <Button
                  key={dia}
                  variant={selectedDia === dia ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDia(dia)}
                >
                  Dia {dia}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="elegant" onClick={handleGerarQR}>
                <QrCode className="w-4 h-4 mr-2" />
                Gerar QR Code
              </Button>
            </div>
          </div>

          {/* Palavra-Chave do Dia Selecionado */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-normal">Palavra-Chave - Dia {selectedDia}</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => gerarPalavraChave(selectedDia)}
                  disabled={gerandoPalavraChave[selectedDia]}
                >
                  {gerandoPalavraChave[selectedDia] ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : palavrasChave[selectedDia] ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Gerar Nova
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Gerar Palavra-Chave
                    </>
                  )}
                </Button>
              </div>

              {palavrasChave[selectedDia] ? (
                <div className="space-y-2">
                  <Label>Palavra-Chave (6 caracteres)</Label>
                  <div className="flex gap-2">
                    <Input
                      value={palavrasChave[selectedDia].show ? palavrasChave[selectedDia].palavra : "••••••"}
                      readOnly
                      className="font-mono text-lg text-center tracking-wider"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setPalavrasChave(prev => ({
                        ...prev,
                        [selectedDia]: { ...prev[selectedDia], show: !prev[selectedDia].show }
                      }))}
                    >
                      {palavrasChave[selectedDia].show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copiarPalavraChave(palavrasChave[selectedDia].palavra)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Data: {format(new Date(palavrasChave[selectedDia].data), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma palavra-chave gerada para este dia</p>
                  <p className="text-sm mt-1">Clique em "Gerar Palavra-Chave" para criar</p>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <div className="space-y-3">
              {inscricoes.map((inscricao: any) => (
                <div key={inscricao.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-4">
                    <Checkbox
                      checked={isPresente(inscricao.usuario_email, selectedDia)}
                      onCheckedChange={() => handleTogglePresenca(inscricao.usuario_email, selectedDia, inscricao.usuarios?.nome_completo || inscricao.usuario_email)}
                    />
                    <div>
                      <p className="font-normal">{inscricao.usuarios?.nome_completo || "Nome não informado"}</p>
                      <p className="text-sm text-muted-foreground">
                        {inscricao.usuarios?.matricula || "Matrícula N/A"} - {inscricao.usuario_email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={isPresente(inscricao.usuario_email, selectedDia) ? "default" : "outline"}>
                    {isPresente(inscricao.usuario_email, selectedDia) ? "Presente" : "Ausente"}
                  </Badge>
                </div>
              ))}
              {inscricoes.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhum inscrito neste evento.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="inscricoes" className="space-y-4">
          <Card className="p-6">
            <div className="space-y-3">
              {inscricoes.map((inscricao: any) => (
                <div key={inscricao.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-normal">{inscricao.usuarios?.nome_completo || "Nome não informado"}</p>
                    <p className="text-sm text-muted-foreground">{inscricao.usuario_email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={inscricao.status === "confirmada" ? "default" : "outline"}>
                      {inscricao.status}
                    </Badge>

                    {inscricao.pagamentos ? (
                      <>
                        <Badge
                          variant={
                            inscricao.pagamentos.status === "aprovado"
                              ? "default"
                              : inscricao.pagamentos.status === "rejeitado"
                                ? "destructive"
                                : "outline"
                          }
                        >
                          Pag: {inscricao.pagamentos.status}
                        </Badge>
                        {inscricao.pagamentos.status === "pendente" && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-green-500"
                              onClick={() => handleValidarPagamento(inscricao.pagamentos!.id, 'aprovado')}
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-red-500"
                              onClick={() => handleValidarPagamento(inscricao.pagamentos!.id, 'rejeitado')}
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">Sem pagamento</Badge>
                    )}
                  </div>
                </div>
              ))}
              {inscricoes.length === 0 && (
                <p className="text-center text-muted-foreground py-4">Nenhuma inscrição encontrada.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="certificados" className="space-y-4">
          <Card className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Certificados Emitidos</h3>
              <Button onClick={handleEmitirCertificados}>
                Emitir Certificados
              </Button>
            </div>

            <div className="space-y-3">
              {certificados.length > 0 ? (
                certificados.map((cert: any) => (
                  <div key={cert.id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-mono text-sm">{cert.codigo_validacao}</p>
                      <p className="text-xs text-muted-foreground">
                        Emitido em: {format(new Date(cert.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">Nenhum certificado emitido ainda.</p>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-4">
          <Card className="p-6">
            <div className="flex gap-2">
              <Button variant="elegant">
                <BarChart className="w-4 h-4 mr-2" />
                Exportar Presenças
              </Button>
              <Button variant="elegant">
                <Users className="w-4 h-4 mr-2" />
                Exportar Inscritos
              </Button>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal QR Code */}
      <Dialog open={showQRModal} onOpenChange={(open) => {
        setShowQRModal(open);
        if (!open) {
          setQrCodeUrl(null);
          setShowKey(false);
        }
      }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>QR Code do Evento</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 text-center">
            {qrCodeUrl ? (
              <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 flex items-center justify-center border">
                <img 
                  src={qrCodeUrl} 
                  alt="QR Code do Evento"
                  className="w-full h-full"
                />
              </div>
            ) : (
              <div className="w-64 h-64 mx-auto bg-white rounded-lg p-4 flex items-center justify-center">
                <QrCode className="w-full h-full text-background" />
              </div>
            )}
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Código do QR Code (6 dígitos):</p>
              <div className="flex items-center justify-center gap-2">
                <p className="text-2xl font-mono tracking-wider">
                  {showKey && evento?.codigo_qrcode ? evento.codigo_qrcode : "••••••"}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowKey(!showKey)}
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-xs text-muted-foreground mb-1">Link compartilhável:</p>
              <code className="text-xs break-all">
                {evento?.codigo_qrcode 
                  ? `${window.location.origin}/registrar-presenca/${evento.codigo_qrcode}`
                  : 'Código não disponível'}
              </code>
            </div>
            {qrCodeUrl && (
              <Button
                variant="outline"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = qrCodeUrl;
                  link.download = `qrcode-${evento?.titulo?.replace(/\s+/g, '-') || 'evento'}.png`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  toast.success('QR Code baixado!');
                }}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar QR Code
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
