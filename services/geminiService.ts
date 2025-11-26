import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const transcribeAudio = async (base64Audio: string, mimeType: string): Promise<string> => {
  try {
    // We explicitly ask for Urdu script.
    const prompt = `
      Please transcribe the following audio file into Urdu text. 
      The output must be in the Urdu script (Nastaliq style preferred if possible, but standard Urdu unicode is required).
      Do not provide any translation or introductory text. Just the direct transcription.
      If the audio is silent or unintelligible, respond with "[Audio is unclear]".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Audio
            }
          },
          { text: prompt }
        ]
      },
      config: {
        temperature: 0.2, // Lower temperature for more accurate transcription
      }
    });

    if (response.text) {
      return response.text;
    } else {
      throw new Error("No text returned from model.");
    }
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
};