import { z } from "zod";

function integerFromAi(defaultValue = 0) {
  return z.preprocess((value) => {
    if (value === null || value === undefined || value === "") {
      return defaultValue;
    }

    if (typeof value === "string" && value.includes(":")) {
      const [minutes, seconds] = value.split(":").map(Number);

      if (Number.isFinite(minutes)) {
        return Math.round(minutes + (Number.isFinite(seconds) ? seconds / 60 : 0));
      }
    }

    const parsed = typeof value === "number" ? value : Number(value);

    return Number.isFinite(parsed) ? Math.round(parsed) : defaultValue;
  }, z.number().int().default(defaultValue));
}

const nullableIntegerFromAi = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(value);

  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}, z.number().int().nullable().optional());

export const analyzedPlayerSchema = z.object({
  name: z.string().min(1),
  jerseyNumber: nullableIntegerFromAi,
  minutes: integerFromAi(),
  points: integerFromAi(),
  fgMade: integerFromAi(),
  fgAtt: integerFromAi(),
  twoMade: integerFromAi(),
  twoAtt: integerFromAi(),
  threeMade: integerFromAi(),
  threeAtt: integerFromAi(),
  ftMade: integerFromAi(),
  ftAtt: integerFromAi(),
  offReb: integerFromAi(),
  defReb: integerFromAi(),
  assists: integerFromAi(),
  steals: integerFromAi(),
  blocks: integerFromAi(),
  turnovers: integerFromAi(),
  fouls: integerFromAi(),
  plusMinus: integerFromAi(),
  efficiency: nullableIntegerFromAi,
});

export const gameAnalysisSchema = z.object({
  category: z.enum(["PM", "M"]),
  categoryLabel: z.enum(["+30", "+40"]),
  opponent: z.string().min(1),
  date: z.string().nullable().optional(),
  isHome: z.boolean(),
  finalScore: z.object({
    spurs: z.number().int(),
    rival: z.number().int(),
  }),
  quarters: z.array(
    z.object({
      spurs: z.number().int(),
      rival: z.number().int(),
    }),
  ).length(4),
  whatsappSummary: z.string().min(1),
  leaders: z.object({
    points: z.array(z.string()).default([]),
    assists: z.array(z.string()).default([]),
    rebounds: z.array(z.string()).default([]),
    efficiency: z.array(z.string()).default([]),
  }),
  validation: z.object({
    resultValidated: z.boolean(),
    quartersMatchFinal: z.boolean(),
    leadersAreSpursPlayers: z.boolean(),
    noPreviousGamesUsed: z.boolean(),
    notes: z.string().default(""),
  }),
  players: z.array(analyzedPlayerSchema).min(1),
});

export type GameAnalysis = z.infer<typeof gameAnalysisSchema>;

const prompt = `Actua como cronista deportivo y analista de basquet amateur, especializado en resumir partidos del equipo J.P. Spurs.

Analiza unicamente la informacion del PDF adjunto. No uses datos de memoria ni partidos anteriores.

Valida dos veces:
- Que Spurs este correctamente identificado como local o visitante.
- Que el resultado final coincida con la suma de los cuartos.
- Que los lideres estadisticos sean jugadores de Spurs.
- Que los nombres esten bien tomados del boxscore.
- Que no se usen datos de otros partidos.

Extrae el box score completo de Spurs y devuelve SOLO JSON valido con esta forma:
{
  "category": "PM" | "M",
  "categoryLabel": "+30" | "+40",
  "opponent": "Rival",
  "date": "YYYY-MM-DD" | null,
  "isHome": true,
  "finalScore": { "spurs": 0, "rival": 0 },
  "quarters": [{ "spurs": 0, "rival": 0 }, { "spurs": 0, "rival": 0 }, { "spurs": 0, "rival": 0 }, { "spurs": 0, "rival": 0 }],
  "whatsappSummary": "Resumen de 8 a 12 lineas, tono cronista profesional, emojis moderados.",
  "leaders": {
    "points": ["Apellido I. XX"],
    "assists": ["Apellido I. XX"],
    "rebounds": ["Apellido I. XX"],
    "efficiency": ["Apellido I. XX"]
  },
  "validation": {
    "resultValidated": true,
    "quartersMatchFinal": true,
    "leadersAreSpursPlayers": true,
    "noPreviousGamesUsed": true,
    "notes": ""
  },
  "players": [{
    "name": "Nombre Apellido",
    "jerseyNumber": null,
    "minutes": 0,
    "points": 0,
    "fgMade": 0,
    "fgAtt": 0,
    "twoMade": 0,
    "twoAtt": 0,
    "threeMade": 0,
    "threeAtt": 0,
    "ftMade": 0,
    "ftAtt": 0,
    "offReb": 0,
    "defReb": 0,
    "assists": 0,
    "steals": 0,
    "blocks": 0,
    "turnovers": 0,
    "fouls": 0,
    "plusMinus": 0,
    "efficiency": 0
  }]
}

Importante:
- category debe ser exactamente "PM" para Pre Maxi/+30 o "M" para Maxi/+40.
- categoryLabel debe ser exactamente "+30" o "+40". No uses "PM", "M", "Pre Maxi" ni "Maxi" en categoryLabel.

Reglas especiales para whatsappSummary:
- Si un jugador de Spurs consigue mas de 5 robos, mencionalo.
- Si un jugador de Spurs consigue mas de 3 triples, mencionalo.
- No digas MVP.
- Si algun dato no aparece o no coincide, explicalo en validation.notes y no inventes.`;

function extractJson(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) {
    return trimmed;
  }

  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (match) {
    return match[1];
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function normalizeCategory(value: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();

  if (["pm", "+30", "30", "premaxi", "pre-maxi"].includes(normalized)) {
    return "PM";
  }

  if (["m", "+40", "40", "maxi", "maxi+40"].includes(normalized)) {
    return "M";
  }

  return value;
}

function normalizeCategoryLabel(value: unknown, category: unknown) {
  const normalized = String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
  const normalizedCategory = normalizeCategory(category);

  if (["+30", "30", "pm", "premaxi", "pre-maxi"].includes(normalized)) {
    return "+30";
  }

  if (["+40", "40", "m", "maxi", "maxi+40"].includes(normalized)) {
    return "+40";
  }

  if (normalizedCategory === "PM") {
    return "+30";
  }

  if (normalizedCategory === "M") {
    return "+40";
  }

  return value;
}

function normalizeAnalysisPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return payload;
  }

  const record = payload as Record<string, unknown>;

  return {
    ...record,
    category: normalizeCategory(record.category),
    categoryLabel: normalizeCategoryLabel(record.categoryLabel, record.category),
  };
}

function parseAnalysis(text: string) {
  const parsed = normalizeAnalysisPayload(JSON.parse(extractJson(String(text))));

  return gameAnalysisSchema.parse(parsed);
}

async function analyzeWithGemini(input: {
  fileName: string;
  contentType: string;
  base64: string;
  apiKey: string;
  model: string;
}) {
  const configuredBaseUrl = process.env.AI_GATEWAY_BASE_URL;
  const baseUrl =
    configuredBaseUrl && !configuredBaseUrl.includes("openai.com")
      ? configuredBaseUrl
      : "https://generativelanguage.googleapis.com/v1beta";
  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/models/${input.model}:generateContent?key=${input.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: input.contentType || "application/pdf",
                  data: input.base64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini respondio ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const text =
    payload.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("") ?? "";

  if (!text) {
    throw new Error("Gemini no devolvio texto analizable.");
  }

  return parseAnalysis(text);
}

async function analyzeWithOpenAiCompatible(input: {
  fileName: string;
  contentType: string;
  base64: string;
  apiKey: string;
  model: string;
}) {
  const baseUrl = process.env.AI_GATEWAY_BASE_URL ?? "https://api.openai.com/v1";
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: input.model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            {
              type: "input_file",
              filename: input.fileName,
              file_data: `data:${input.contentType};base64,${input.base64}`,
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`La IA respondio ${response.status}: ${await response.text()}`);
  }

  const payload = await response.json();
  const text = payload.output_text ?? payload.choices?.[0]?.message?.content ?? "";

  return parseAnalysis(text);
}

export async function analyzeGamePdf(input: {
  fileName: string;
  contentType: string;
  base64: string;
}) {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  const provider = process.env.AI_GATEWAY_PROVIDER || "gemini";
  const model = process.env.AI_GATEWAY_MODEL || "gemini-2.5-flash";

  if (!apiKey) {
    throw new Error("Falta AI_GATEWAY_API_KEY para analizar PDFs.");
  }

  if (provider === "gemini" || model.startsWith("gemini")) {
    return analyzeWithGemini({ ...input, apiKey, model });
  }

  return analyzeWithOpenAiCompatible({ ...input, apiKey, model });
}
