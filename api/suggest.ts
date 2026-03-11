/**
 * Vercel Serverless Function — Proxy para API Gemini
 * A API key fica no servidor, nunca exposta ao frontend.
 * 
 * Deploy: Coloque na pasta api/ na raiz do projeto Vercel.
 * Env var necessária no Vercel: GEMINI_API_KEY
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { taskTitle } = req.body;
  if (!taskTitle || typeof taskTitle !== 'string') {
    return res.status(400).json({ error: 'taskTitle is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server' });
  }

  try {
    const { GoogleGenAI, Type } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `Analise a tarefa: "${taskTitle}".`,
      config: {
        systemInstruction: "Você é um assistente de produtividade especialista. Retorne um objeto JSON com uma descrição de 1 parágrafo e 3 passos curtos (subtasks).",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            description: {
              type: Type.STRING,
              description: 'Uma explicação de 1 parágrafo sobre como realizar a tarefa.',
            },
            subtasks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Um array de exatamente 3 passos curtos para concluí-la.',
            },
          },
          required: ["description", "subtasks"],
        },
      }
    });

    const jsonStr = response.text || "{}";
    const data = JSON.parse(jsonStr);

    return res.status(200).json({
      description: data.description || "Descrição sugerida pela IA.",
      subtasks: data.subtasks || ["Passo 1", "Passo 2", "Passo 3"]
    });
  } catch (error: any) {
    console.error("Erro Gemini API:", error);
    return res.status(500).json({
      error: 'Falha ao gerar sugestão',
      description: "Erro ao gerar detalhes.",
      subtasks: []
    });
  }
}
