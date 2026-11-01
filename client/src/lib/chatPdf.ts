import type { StudentRecord } from "@/lib/studentData";

/* ====================================================================== *
 *  CHAT TRANSCRIPT AS A PDF                                              *
 *                                                                        *
 *  Written by hand rather than pulled from a library. A PDF of plain     *
 *  text is a small, well-specified format, and this saves roughly 150 KB *
 *  of JavaScript on a site whose whole point is loading fast on a phone  *
 *  in Tangail.                                                           *
 *                                                                        *
 *  Helvetica is one of the fourteen faces every PDF reader carries, so   *
 *  nothing has to be embedded. Text is encoded WinAnsi, which covers     *
 *  Latin-1; anything outside it is folded to its nearest plain letter    *
 *  rather than written as a broken byte.                                 *
 * ====================================================================== */

const PAGE_W = 595.28; // A4 at 72dpi
const PAGE_H = 841.89;
const MARGIN = 56;
const BODY_SIZE = 10;
const LINE = 14;
const WRAP = 92; // characters per line at 10pt Helvetica inside the margins

/** WinAnsi has no slot for the typographic marks a browser may paste in. */
function toLatin1(s: string): string {
  return s
    .replace(/[‘’‚′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .replace(/[^\x20-\xFF\n]/g, "?");
}

/** Parentheses and backslashes end a PDF string early if left as they are. */
function escapePdf(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!word) continue;
      if (line.length + word.length + 1 > width) {
        if (line) out.push(line);
        // a single word longer than the line is cut rather than left to
        // run off the page
        let rest = word;
        while (rest.length > width) {
          out.push(rest.slice(0, width));
          rest = rest.slice(width);
        }
        line = rest;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    out.push(line);
  }
  return out;
}

type Line = { text: string; bold?: boolean; size?: number; gapBefore?: number };

function buildLines(student: StudentRecord): Line[] {
  const lines: Line[] = [
    { text: "Study Hub BD", bold: true, size: 16 },
    { text: "Message history", size: 11, gapBefore: 4 },
    { text: "", size: 6 },
    { text: `Student: ${student.name}`, size: 10 },
    { text: `File: ${student.studentId}`, size: 10 },
    { text: `Counsellor: ${student.counsellor}`, size: 10 },
    {
      text: `Downloaded: ${new Date().toLocaleString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}`,
      size: 10,
    },
    { text: "", size: 6 },
  ];

  let lastDay = "";
  for (const m of student.messages) {
    const d = new Date(m.at);
    const day = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    if (day !== lastDay) {
      lines.push({ text: day, bold: true, size: 10, gapBefore: 12 });
      lastDay = day;
    }
    const time = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const who = m.from === "student" ? student.name : m.author;
    lines.push({ text: `${who}, ${time}`, bold: true, size: 10, gapBefore: 8 });
    if (m.body) {
      for (const l of wrap(m.body, WRAP))
        lines.push({ text: l, size: BODY_SIZE });
    }
    for (const a of m.attachments ?? []) {
      const label = a.kind === "image" ? "Image" : "File";
      lines.push({ text: `[${label}: ${a.name}]`, size: BODY_SIZE });
    }
  }

  lines.push({
    text: "This transcript was produced by the Study Hub BD student portal prototype.",
    size: 8,
    gapBefore: 18,
  });
  return lines;
}

/** Lays the lines onto pages and returns one content stream per page. */
function paginate(lines: Line[]): string[] {
  const pages: string[] = [];
  let body = "";
  let y = PAGE_H - MARGIN;

  const flush = () => {
    if (body) pages.push(body);
    body = "";
    y = PAGE_H - MARGIN;
  };

  for (const line of lines) {
    const size = line.size ?? BODY_SIZE;
    const step = Math.max(LINE, size + 4);
    y -= (line.gapBefore ?? 0) + step;
    if (y < MARGIN) {
      flush();
      y = PAGE_H - MARGIN - step;
    }
    const font = line.bold ? "/F2" : "/F1";
    const text = escapePdf(toLatin1(line.text));
    body += `BT ${font} ${size} Tf 1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (${text}) Tj ET\n`;
  }
  flush();
  return pages.length ? pages : [""];
}

function buildPdf(student: StudentRecord): Uint8Array {
  const contents = paginate(buildLines(student));
  const pageCount = contents.length;

  // object 1 catalog, 2 pages, 3 and 4 fonts, then page/content pairs
  const firstPageObj = 5;
  const kids = contents.map((_, i) => `${firstPageObj + i * 2} 0 R`).join(" ");

  const objects: string[] = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`,
  ];

  contents.forEach((stream, i) => {
    const contentObjNum = firstPageObj + i * 2 + 1;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
        `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjNum} 0 R >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}endstream`);
  });

  // Assemble, recording the byte offset of every object for the xref table.
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefAt = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets)
    pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf +=
    `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefAt}\n%%EOF\n`;

  // Latin-1 out, one byte per character, so the offsets above stay true.
  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
  return bytes;
}

export function downloadChatPdf(student: StudentRecord) {
  const blob = new Blob([buildPdf(student)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Study Hub BD messages ${student.studentId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
