import type { SimuladoGerado } from "@/types/simulado"

const STORAGE_KEY = "prova-secreta:historico"

export function carregarHistorico(): SimuladoGerado[] {
  if (typeof window === "undefined") return []

  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []

    const parsed = JSON.parse(raw)

    if (!Array.isArray(parsed)) return []

    return parsed
  } catch (error) {
    console.error("Erro ao carregar histórico:", error)
    return []
  }
}

export function salvarNoHistorico(item: SimuladoGerado) {
  if (typeof window === "undefined") return

  try {
    const atual = carregarHistorico()

    const novoHistorico = [item, ...atual.filter((registro) => registro.id !== item.id)].slice(
      0,
      10
    )

    localStorage.setItem(STORAGE_KEY, JSON.stringify(novoHistorico))
  } catch (error) {
    console.error("Erro ao salvar histórico:", error)
  }
}

export function limparHistorico() {
  if (typeof window === "undefined") return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Erro ao limpar histórico:", error)
  }
}