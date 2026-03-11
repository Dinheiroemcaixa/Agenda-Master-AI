
/**
 * Serviço Gemini — chama a API serverless /api/suggest
 * A chave da API nunca é exposta ao frontend.
 */

export const suggestTaskDetails = async (taskTitle: string): Promise<{description: string, subtasks: string[]}> => {
  try {
    const response = await fetch('/api/suggest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskTitle }),
    });

    if (!response.ok) {
      throw new Error(`API retornou status ${response.status}`);
    }

    const data = await response.json();

    return {
      description: data.description || "Descrição sugerida pela IA.",
      subtasks: data.subtasks || ["Passo 1", "Passo 2", "Passo 3"]
    };
  } catch (error) {
    console.error("Erro Gemini:", error);
    return { description: "Erro ao gerar detalhes.", subtasks: [] };
  }
};
