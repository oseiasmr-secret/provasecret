import { PDFDocument, StandardFonts, rgb } from "pdf-lib"

export type QuestaoPDF = {
  enunciado: string
  alternativas: string[]
}

export type DadosProvaPDF = {
  titulo: string
  disciplina?: string
  serie?: string
  professor?: string
  questoes: QuestaoPDF[]
  nomeArquivo?: string
}

export async function gerarProvaPDF(dados: DadosProvaPDF) {
  const pdfDoc = await PDFDocument.create()

  let page = pdfDoc.addPage([595.28, 841.89]) // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const margin = 50
  const pageWidth = page.getWidth()
  const pageHeight = page.getHeight()
  const maxWidth = pageWidth - margin * 2

  let y = pageHeight - margin

  function addNewPage() {
    page = pdfDoc.addPage([595.28, 841.89])
    y = page.getHeight() - margin
  }

  function ensureSpace(requiredHeight: number) {
    if (y - requiredHeight < margin) {
      addNewPage()
    }
  }

  function quebrarTexto(
    texto: string,
    fonte: typeof font,
    fontSize: number,
    larguraMaxima: number
  ): string[] {
    const paragrafos = texto.split("\n")
    const linhasFinais: string[] = []

    for (const paragrafo of paragrafos) {
      const textoLimpo = paragrafo.trim()

      if (!textoLimpo) {
        linhasFinais.push("")
        continue
      }

      const palavras = textoLimpo.split(/\s+/)
      let linhaAtual = ""

      for (const palavra of palavras) {
        const tentativa = linhaAtual ? `${linhaAtual} ${palavra}` : palavra
        const largura = fonte.widthOfTextAtSize(tentativa, fontSize)

        if (largura <= larguraMaxima) {
          linhaAtual = tentativa
        } else {
          if (linhaAtual) linhasFinais.push(linhaAtual)
          linhaAtual = palavra
        }
      }

      if (linhaAtual) linhasFinais.push(linhaAtual)
    }

    return linhasFinais
  }

  function drawTextBlock(
    texto: string,
    options?: {
      size?: number
      bold?: boolean
      lineHeight?: number
      indent?: number
      color?: { r: number; g: number; b: number }
    }
  ) {
    const size = options?.size ?? 12
    const bold = options?.bold ?? false
    const lineHeight = options?.lineHeight ?? size + 4
    const indent = options?.indent ?? 0
    const activeFont = bold ? fontBold : font
    const color = options?.color ?? { r: 0, g: 0, b: 0 }

    const linhas = quebrarTexto(texto, activeFont, size, maxWidth - indent)

    ensureSpace(Math.max(linhas.length, 1) * lineHeight)

    if (linhas.length === 0) {
      y -= lineHeight
      return
    }

    for (const linha of linhas) {
      page.drawText(linha, {
        x: margin + indent,
        y,
        size,
        font: activeFont,
        color: rgb(color.r, color.g, color.b),
      })
      y -= lineHeight
    }
  }

  function drawLinhaHorizontal() {
    ensureSpace(20)

    page.drawLine({
      start: { x: margin, y },
      end: { x: pageWidth - margin, y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    })

    y -= 18
  }

  // Cabeçalho
  drawTextBlock(dados.titulo || "Prova Secreta", {
    size: 22,
    bold: true,
    lineHeight: 28,
  })

  drawTextBlock("Simulação personalizada de avaliação", {
    size: 11,
    lineHeight: 16,
    color: { r: 0.35, g: 0.35, b: 0.35 },
  })

  y -= 8
  drawLinhaHorizontal()

  if (dados.disciplina) {
    drawTextBlock(`Disciplina: ${dados.disciplina}`, {
      size: 12,
      lineHeight: 18,
    })
  }

  if (dados.serie) {
    drawTextBlock(`Série: ${dados.serie}`, {
      size: 12,
      lineHeight: 18,
    })
  }

  if (dados.professor) {
    drawTextBlock(`Professor: ${dados.professor}`, {
      size: 12,
      lineHeight: 18,
    })
  }

  drawTextBlock(`Data de geração: ${new Date().toLocaleDateString("pt-BR")}`, {
    size: 12,
    lineHeight: 18,
  })

  y -= 10

  drawTextBlock(
    "Instruções: leia atentamente cada questão e assinale apenas uma alternativa.",
    {
      size: 11,
      lineHeight: 16,
    }
  )

  y -= 18

  // Questões
  dados.questoes.forEach((questao, index) => {
    ensureSpace(90)

    drawTextBlock(`Questão ${index + 1}`, {
      size: 14,
      bold: true,
      lineHeight: 20,
    })

    drawTextBlock(questao.enunciado, {
      size: 12,
      lineHeight: 18,
    })

    y -= 4

    questao.alternativas.forEach((alternativa, i) => {
      const letra = String.fromCharCode(65 + i)
      drawTextBlock(`${letra}) ${alternativa}`, {
        size: 12,
        lineHeight: 18,
        indent: 12,
      })
    })

    y -= 14
  })

  // Rodapé com numeração
  const pages = pdfDoc.getPages()
  pages.forEach((currentPage, index) => {
    currentPage.drawLine({
      start: { x: margin, y: 32 },
      end: { x: currentPage.getWidth() - margin, y: 32 },
      thickness: 0.6,
      color: rgb(0.85, 0.85, 0.85),
    })

    currentPage.drawText("Documento gerado pela plataforma Prova Secreta", {
      x: margin,
      y: 18,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })

    currentPage.drawText(`Página ${index + 1} de ${pages.length}`, {
      x: currentPage.getWidth() - 95,
      y: 18,
      size: 9,
      font,
      color: rgb(0.45, 0.45, 0.45),
    })
  })

  const pdfBytes = await pdfDoc.save()

  const arrayBuffer = pdfBytes.buffer.slice(
    pdfBytes.byteOffset,
    pdfBytes.byteOffset + pdfBytes.byteLength
  ) as ArrayBuffer

  const blob = new Blob([arrayBuffer], {
    type: "application/pdf",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = dados.nomeArquivo || "prova-secreta.pdf"
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}