import { useState, useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search } from "lucide-react";

// Fix do ícone padrão do Leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// @ts-expect-error - Leaflet icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

interface MapPickerProps {
  onLocationSelect: (location: { address: string; lat: number; lng: number }) => void;
  initialLocation?: { lat: number; lng: number };
  raioValidacaoMetros?: number; // Raio de validação GPS em metros
}

export default function MapPicker({ onLocationSelect, initialLocation, raioValidacaoMetros = 100 }: MapPickerProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const circleRef = useRef<L.Circle | null>(null); // Círculo do raio de validação
  const mapContainerRef = useRef<HTMLDivElement>(null);
  
  const [position, setPosition] = useState<[number, number] | null>(
    initialLocation ? [initialLocation.lat, initialLocation.lng] : null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Função para criar/atualizar círculo de raio
  const atualizarCirculoRaio = (map: L.Map, center: [number, number]) => {
    // Remover círculo anterior se existir
    if (circleRef.current) {
      circleRef.current.remove();
    }

    // Criar novo círculo verde
    const circle = L.circle(center, {
      color: '#22c55e', // Verde
      fillColor: '#22c55e',
      fillOpacity: 0.15,
      weight: 2,
      radius: raioValidacaoMetros // Raio em metros
    }).addTo(map);

    circleRef.current = circle;

    // Ajustar zoom para mostrar todo o círculo
    const bounds = circle.getBounds();
    map.fitBounds(bounds, { padding: [50, 50] });
  };

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialCenter: [number, number] = initialLocation 
      ? [initialLocation.lat, initialLocation.lng] 
      : [-29.6869, -53.8148]; // Santo Augusto, RS

    // Criar mapa
    const map = L.map(mapContainerRef.current).setView(initialCenter, 15);

    // Adicionar camada de tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Adicionar marcador inicial se houver
    if (position) {
      const marker = L.marker(position).addTo(map);
      markerRef.current = marker;
      
      // Adicionar círculo de raio
      atualizarCirculoRaio(map, position);
    }

    // Evento de clique no mapa
    map.on("click", async (e) => {
      const { lat, lng } = e.latlng;
      const newPosition: [number, number] = [lat, lng];
      
      setPosition(newPosition);
      
      // Atualizar ou criar marcador
      if (markerRef.current) {
        markerRef.current.setLatLng(newPosition);
      } else {
        const marker = L.marker(newPosition).addTo(map);
        markerRef.current = marker;
      }

      // Atualizar círculo de raio
      atualizarCirculoRaio(map, newPosition);

      // Buscar endereço
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();

        onLocationSelect({
          address: data.display_name || "Local selecionado",
          lat,
          lng,
        });
      } catch (error) {
        console.error("Erro ao buscar endereço:", error);
        onLocationSelect({
          address: "Local selecionado",
          lat,
          lng,
        });
      }
    });

    mapRef.current = map;

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Atualizar círculo quando o raio mudar
  useEffect(() => {
    if (mapRef.current && position) {
      atualizarCirculoRaio(mapRef.current, position);
    }
  }, [raioValidacaoMetros]); // eslint-disable-line react-hooks/exhaustive-deps

  // Busca endereço usando Nominatim (OpenStreetMap)
  const handleSearch = async () => {
    if (!searchQuery.trim() || !mapRef.current) return;

    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon, display_name } = data[0];
        const newPosition: [number, number] = [parseFloat(lat), parseFloat(lon)];
        
        setPosition(newPosition);
        
        // Atualizar ou criar marcador
        if (markerRef.current) {
          markerRef.current.setLatLng(newPosition);
        } else {
          const marker = L.marker(newPosition).addTo(mapRef.current);
          markerRef.current = marker;
        }

        // Atualizar círculo de raio
        atualizarCirculoRaio(mapRef.current, newPosition);
        
        onLocationSelect({
          address: display_name,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
        });
      } else {
        alert("Local não encontrado. Tente outro termo de busca.");
      }
    } catch (error) {
      console.error("Erro ao buscar local:", error);
      alert("Erro ao buscar local. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Barra de pesquisa */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquise um endereço ou local..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button 
          onClick={handleSearch} 
          disabled={loading || !searchQuery.trim()}
          variant="outline"
        >
          {loading ? "Buscando..." : "Buscar"}
        </Button>
      </div>

      {/* Informação */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span>
          {position 
            ? `Coordenadas: ${position[0].toFixed(6)}, ${position[1].toFixed(6)}`
            : "Clique no mapa para selecionar a localização"
          }
        </span>
      </div>

      {/* Mapa */}
      <div 
        ref={mapContainerRef}
        className="h-[400px] rounded-lg overflow-hidden border"
        style={{ zIndex: 0 }}
      />

      {/* Legenda do círculo verde */}
      {position && (
        <div className="flex items-center gap-2 text-sm p-3 bg-green-500/10 rounded-lg border border-green-500/20">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-muted-foreground">
            Área verde = Raio de validação GPS de <strong>{raioValidacaoMetros}m</strong> ({(raioValidacaoMetros / 1000).toFixed(raioValidacaoMetros >= 1000 ? 1 : 2)}km)
          </span>
        </div>
      )}

      {/* Instruções */}
      <p className="text-xs text-muted-foreground">
        💡 Pesquise um endereço ou clique diretamente no mapa para definir a localização do evento
      </p>
    </div>
  );
}
