/**
 * Utilitários para cálculos de GPS e validação de localização
 */

/**
 * Calcula a distância entre duas coordenadas GPS usando a fórmula de Haversine
 * @param lat1 Latitude do ponto 1
 * @param lon1 Longitude do ponto 1
 * @param lat2 Latitude do ponto 2
 * @param lon2 Longitude do ponto 2
 * @returns Distância em metros
 */
export function calcularDistanciaGPS(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Raio da Terra em metros
  const φ1 = (lat1 * Math.PI) / 180; // φ, λ em radianos
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distancia = R * c; // em metros
  return Math.round(distancia); // Arredonda para metros inteiros
}

/**
 * Verifica se um ponto está dentro do raio permitido
 * @param latAluno Latitude do aluno
 * @param lonAluno Longitude do aluno
 * @param latEvento Latitude do evento
 * @param lonEvento Longitude do evento
 * @param raioMetros Raio permitido em metros
 * @returns { valido: boolean, distancia: number }
 */
export function validarProximidadeGPS(
  latAluno: number,
  lonAluno: number,
  latEvento: number,
  lonEvento: number,
  raioMetros: number
): { valido: boolean; distancia: number; mensagem: string } {
  const distancia = calcularDistanciaGPS(latAluno, lonAluno, latEvento, lonEvento);
  const valido = distancia <= raioMetros;

  let mensagem = "";
  if (valido) {
    mensagem = `✅ Você está a ${distancia}m do evento (dentro do raio de ${raioMetros}m)`;
  } else {
    mensagem = `❌ Você está a ${distancia}m do evento (fora do raio de ${raioMetros}m)`;
  }

  return { valido, distancia, mensagem };
}

/**
 * Formata distância para exibição amigável
 * @param metros Distância em metros
 * @returns String formatada (ex: "150m" ou "1.5km")
 */
export function formatarDistancia(metros: number): string {
  if (metros < 1000) {
    return `${metros}m`;
  }
  return `${(metros / 1000).toFixed(1)}km`;
}

/**
 * Obtém a localização atual do usuário via GPS
 * @returns Promise com { latitude, longitude } ou erro
 */
export async function obterLocalizacaoAtual(): Promise<{
  latitude: number;
  longitude: number;
  precisao: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocalização não é suportada pelo navegador"));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          precisao: position.coords.accuracy, // Precisão em metros
        });
      },
      (error) => {
        let mensagem = "Erro ao obter localização";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            mensagem = "Permissão de localização negada. Ative o GPS e permita o acesso.";
            break;
          case error.POSITION_UNAVAILABLE:
            mensagem = "Localização indisponível. Verifique se o GPS está ativado.";
            break;
          case error.TIMEOUT:
            mensagem = "Tempo esgotado ao obter localização. Tente novamente.";
            break;
        }
        reject(new Error(mensagem));
      },
      {
        enableHighAccuracy: true, // Usa GPS (mais preciso)
        timeout: 10000, // 10 segundos
        maximumAge: 0, // Não usar cache
      }
    );
  });
}

/**
 * Exemplos de raios comuns e seus significados
 */
export const RAIOS_VALIDACAO = {
  DENTRO_PREDIO: 50, // 50m - Dentro do mesmo prédio
  NO_CAMPUS: 100, // 100m - Padrão, dentro do campus
  AREA_PROXIMA: 200, // 200m - Área próxima ao local
  QUARTEIRAO: 500, // 500m - Quarteirão
  UM_QUILOMETRO: 1000, // 1km - Eventos externos
  AREA_AMPLA: 2000, // 2km - Eventos em área ampla
} as const;

/**
 * Descrições amigáveis dos raios
 */
export const DESCRICOES_RAIO: Record<number, string> = {
  50: "Dentro do prédio",
  100: "No campus (Recomendado)",
  200: "Área próxima",
  500: "Quarteirão",
  1000: "1 km (Eventos externos)",
  2000: "2 km (Área ampla)",
};
