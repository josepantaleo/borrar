const fs = require("node:fs");
const path = require("node:path");
const {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  Packer,
  PageBreak,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TextRun,
  WidthType
} = require("docx");

const source = path.resolve(__dirname, "..", "informe-pedagogico-cooperacion.md");
const target = path.resolve(__dirname, "..", "Informe-pedagogico-cooperacion-docente-estudiante.docx");
const lines = fs.readFileSync(source, "utf8").replace(/\r/g, "").split("\n");

function inlineRuns(text, options = {}) {
  const runs = [];
  const pattern = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let cursor = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index > cursor) runs.push(new TextRun({ text: text.slice(cursor, match.index), ...options }));
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true, ...options }));
    } else {
      runs.push(new TextRun({
        text: token.slice(1, -1),
        font: "Consolas",
        color: "334155",
        shading: { fill: "E2E8F0" },
        ...options
      }));
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) runs.push(new TextRun({ text: text.slice(cursor), ...options }));
  return runs.length ? runs : [new TextRun({ text, ...options })];
}

function tableFromMarkdown(block) {
  const rows = block
    .filter((_, index) => index !== 1)
    .map(line => line.split("|").slice(1, -1).map(value => value.trim()));
  const widths = rows[0].map((_, index) => index === 0 ? 18 : Math.floor(82 / Math.max(1, rows[0].length - 1)));
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: rows.map((cells, rowIndex) => new TableRow({
      tableHeader: rowIndex === 0,
      cantSplit: true,
      children: cells.map((value, index) => new TableCell({
        width: { size: widths[index], type: WidthType.PERCENTAGE },
        shading: rowIndex === 0 ? { fill: "0F766E" } : (rowIndex % 2 ? { fill: "F1F5F9" } : undefined),
        margins: { top: 100, bottom: 100, left: 110, right: 110 },
        borders: {
          top: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 4 },
          bottom: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 4 },
          left: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 4 },
          right: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 4 }
        },
        children: [new Paragraph({
          children: inlineRuns(value, {
            bold: rowIndex === 0,
            color: rowIndex === 0 ? "FFFFFF" : "1E293B",
            size: 18
          }),
          spacing: { after: 0 }
        })]
      }))
    }))
  });
}

const body = [];
let index = 0;
while (index < lines.length) {
  const raw = lines[index];
  const line = raw.trim();
  if (!line) {
    index += 1;
    continue;
  }
  if (line.startsWith("|") && index + 1 < lines.length && /^\|[\s:|-]+\|$/.test(lines[index + 1].trim())) {
    const tableLines = [];
    while (index < lines.length && lines[index].trim().startsWith("|")) {
      tableLines.push(lines[index].trim());
      index += 1;
    }
    body.push(tableFromMarkdown(tableLines));
    body.push(new Paragraph({ spacing: { after: 140 } }));
    continue;
  }
  const heading = line.match(/^(#{1,3})\s+(.+)$/);
  if (heading) {
    const level = heading[1].length;
    body.push(new Paragraph({
      text: heading[2],
      heading: level === 1 ? HeadingLevel.TITLE : level === 2 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2,
      pageBreakBefore: level === 2 && /^([7-9]|10)\./.test(heading[2]),
      spacing: { before: level === 1 ? 0 : 260, after: 120 }
    }));
    index += 1;
    continue;
  }
  const numbered = line.match(/^(\d+)\.\s+(.+)$/);
  if (numbered) {
    body.push(new Paragraph({
      children: inlineRuns(numbered[2], { size: 21, color: "1E293B" }),
      numbering: { reference: "numbered-list", level: 0 },
      spacing: { after: 70 },
      indent: { left: 360, hanging: 180 }
    }));
    index += 1;
    continue;
  }
  const bullet = line.match(/^-\s+(.+)$/);
  if (bullet) {
    body.push(new Paragraph({
      children: inlineRuns(bullet[1], { size: 21, color: "1E293B" }),
      bullet: { level: 0 },
      spacing: { after: 70 },
      indent: { left: 360, hanging: 180 }
    }));
    index += 1;
    continue;
  }
  const paragraphLines = [line];
  index += 1;
  while (
    index < lines.length &&
    lines[index].trim() &&
    !/^(#{1,3})\s+/.test(lines[index].trim()) &&
    !/^\d+\.\s+/.test(lines[index].trim()) &&
    !/^-\s+/.test(lines[index].trim()) &&
    !lines[index].trim().startsWith("|")
  ) {
    paragraphLines.push(lines[index].trim());
    index += 1;
  }
  body.push(new Paragraph({
    children: inlineRuns(paragraphLines.join(" "), { size: 21, color: "1E293B" }),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 300, after: 140 }
  }));
}

const contentStart = body.findIndex(item => item.options?.heading === HeadingLevel.HEADING_1);
const content = contentStart >= 0 ? body.slice(contentStart) : body;

const cover = [
  new Paragraph({ spacing: { before: 1300 } }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "INFORME PEDAGÓGICO", bold: true, size: 42, color: "0F766E" })],
    spacing: { after: 180 }
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Cooperación docente-estudiante", bold: true, size: 34, color: "0F172A" })],
    spacing: { after: 120 }
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Auditoría técnica de Firestore, rediseño del flujo e indicadores de evaluación", size: 24, color: "475569" })],
    spacing: { after: 700 }
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Práctica interactiva de JavaScript | IPEM 146", bold: true, size: 22, color: "0F766E" })],
    spacing: { after: 100 }
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "7 de septiembre de 2026", size: 21, color: "64748B" })]
  }),
  new Paragraph({ children: [new PageBreak()] }),
  new Paragraph({ text: "Contenido", heading: HeadingLevel.HEADING_1 }),
  new TableOfContents("Contenido", { hyperlink: true, headingStyleRange: "1-2" }),
  new Paragraph({ children: [new PageBreak()] })
];

const document = new Document({
  creator: "Skywork",
  title: "Informe pedagógico sobre cooperación docente-estudiante",
  description: "Evaluación pedagógica, auditoría de Firestore, rediseño y plan de pruebas.",
  styles: {
    default: {
      document: { run: { font: "Aptos", size: 21, color: "1E293B" } },
      title: { run: { font: "Aptos Display", size: 36, bold: true, color: "0F172A" } },
      heading1: { run: { font: "Aptos Display", size: 28, bold: true, color: "0F766E" } },
      heading2: { run: { font: "Aptos Display", size: 23, bold: true, color: "0F172A" } }
    }
  },
  numbering: {
    config: [{
      reference: "numbered-list",
      levels: [{
        level: 0,
        format: "decimal",
        text: "%1.",
        alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 360, hanging: 180 } } }
      }]
    }]
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1100, right: 1050, bottom: 1000, left: 1050 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          children: [new TextRun({ text: "IPEM 146 | Cooperación docente-estudiante", size: 17, color: "64748B" })],
          border: { bottom: { style: BorderStyle.SINGLE, color: "CBD5E1", size: 4 } }
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [
            new TextRun({ text: "Informe pedagógico y auditoría técnica  |  ", size: 17, color: "64748B" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 17, color: "64748B" })
          ]
        })]
      })
    },
    children: [...cover, ...content]
  }]
});

Packer.toBuffer(document).then(buffer => {
  fs.writeFileSync(target, buffer);
  console.log(target);
});
