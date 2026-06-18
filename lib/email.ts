import { Resend } from "resend";

export function getResend() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  return new Resend(process.env.RESEND_API_KEY);
}

export function reportEmailHtml(input: {
  playerName: string;
  opponent: string;
  finalScore?: string | null;
  line: string;
}) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
      <h1 style="margin:0 0 12px">Spurs Stats</h1>
      <p>Hola ${input.playerName}, este es tu reporte del partido contra ${input.opponent}.</p>
      <p><strong>Resultado:</strong> ${input.finalScore ?? "sin resultado cargado"}</p>
      <p><strong>Tu línea:</strong> ${input.line}</p>
    </div>
  `;
}
