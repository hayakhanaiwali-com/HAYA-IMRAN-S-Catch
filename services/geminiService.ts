import { GoogleGenAI } from "@google/genai";
import { GameEvent } from "../types";

const FALLBACK_REACTIONS = [
  "Nice catch.",
  "Reflexes within acceptable parameters.",
  "You missed one.",
  "Keep your eyes on the falling objects.",
  "Speed increasing."
];

export const generateReaction = async (
  event: GameEvent,
  score: number,
  misses: number
): Promise<string> => {
  try {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      return FALLBACK_REACTIONS[Math.floor(Math.random() * FALLBACK_REACTIONS.length)];
    }

    const ai = new GoogleGenAI({ apiKey });
    
    let context = "";
    if (event === 'start') {
      context = "Game started. Player controls a basket to catch falling fruit.";
    } else if (event === 'catch_streak') {
      context = `Player is doing well. Score is ${score}. They are catching fruits efficiently.`;
    } else if (event === 'miss_streak') {
      context = `Player just missed a fruit. Total misses: ${misses}. They need to be faster.`;
    } else if (event === 'gameover') {
      context = `Game over. Final score: ${score}. The player missed too many fruits.`;
    }

    const prompt = `
      You are a high-speed sports commentator AI watching a fruit catching game.
      
      Context: ${context}
      
      Write a very short, punchy, energetic comment (max 12 words).
      
      Tone:
      - If 'catch_streak': Hyped, impressed by speed.
      - If 'miss_streak': Urgent warning, "fumble detected".
      - If 'gameover': Summary of performance, better luck next time.
      - If 'start': "Ready, set, catch!"
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return response.text?.trim() || "System ready.";

  } catch (error) {
    console.error("Gemini API Error:", error);
    return FALLBACK_REACTIONS[Math.floor(Math.random() * FALLBACK_REACTIONS.length)];
  }
};