import { GoogleGenAI } from "@google/genai";

export async function parseScheduleImage(
  file: File,
): Promise<{ day: number; shift: "morning" | "evening" }[]> {
  const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

  if (!API_KEY) {
    throw new Error(
      "Gemini API key is missing. Add VITE_GEMINI_API_KEY to your .env.local file.",
    );
  }

  // 1. Initialize the Client with the new SDK
  const ai = new GoogleGenAI({
    apiKey: API_KEY,
    httpOptions: { apiVersion: "v1beta" },
  });

  try {
    const base64Data = await fileToBase64(file);

    const promptText = `
      Analyze this student class schedule grid image.

      STEP 0: VALIDATION (CRITICAL)
      Look at the far left column. Do you see time labels (e.g., "9am", "12pm", "5pm")?
      - If the time column is MISSING, CUT OFF, or illegible, STOP.
      - Return exactly this JSON: {"error": "missing_time_column"}

      STEP 1: If times are visible, proceed to find "Evening Conflicts" (5:00 PM to 11:00 PM).

      Visual Logic:
      1. Identify the columns for Monday, Tuesday, Wednesday, Thursday, Friday.
         (Sunday=0, Monday=1, ... Saturday=6).
      2. Identify the "5:00 PM" (17:00) horizontal line in the grid.
      3. Look at the area BELOW that 5:00 PM line.

      Strict Rules:
      - If ANY colored class block exists in that "Below 5 PM" area, that evening is BUSY.
      - If a class STARTS at 6:00 PM, 7:00 PM, etc., that evening is BUSY.
      - If a class starts at 4:00 PM and ends at 5:30 PM, it crosses the line, so that evening is BUSY.
      - IGNORE purely Morning classes (e.g., 10am-12pm).
      - IGNORE classes that end *exactly* at 5:00 PM.

      Return a raw JSON array of conflicts:
      Example: [{"day": 2, "shift": "evening"}, {"day": 4, "shift": "evening"}]
      
      Return ONLY valid JSON. No markdown.
    `;

    // 2. Model Strategy: Try your requested model first, then fall back to stable ones
    const modelsToTry = [
      "gemini-3-flash-preview", // Your requested model
      "gemini-2.0-flash-exp", // Current experimental preview
      "gemini-1.5-flash-001", // Stable fallback
    ];

    let lastError;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Scanning with ${modelName}...`);

        const response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              parts: [
                { text: promptText },
                { inlineData: { mimeType: file.type, data: base64Data } },
              ],
            },
          ],
        });

        const text = response.text;
        if (!text) throw new Error("No text returned");

        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsedResult = JSON.parse(cleanJson);

        // --- CHECK FOR VALIDATION ERROR ---
        if (parsedResult.error === "missing_time_column") {
          throw new Error("MISSING_TIME_COLUMN");
        }

        console.log(`SUCCESS! Scanned using ${modelName}`);
        return parsedResult;
      } catch (error: any) {
        // If validation failed (Time column missing), STOP immediately.
        if (error.message === "MISSING_TIME_COLUMN") {
          throw error;
        }
        console.warn(`Failed with ${modelName}. Trying next...`);
        lastError = error;
      }
    }

    throw lastError || new Error("All models failed.");
  } catch (error: any) {
    if (error.message === "MISSING_TIME_COLUMN") {
      throw error;
    }
    console.error("FULL ERROR DETAILS:", error);
    throw error;
  }
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
