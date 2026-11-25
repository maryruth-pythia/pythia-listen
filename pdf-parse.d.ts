declare module 'pdf-parse' {
  interface PdfParseResult {
    text: string;
    numpages: number;
    info: unknown;
  }
  export default function pdfParse(data: Buffer | Uint8Array): Promise<PdfParseResult>;
}
