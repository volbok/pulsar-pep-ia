import express from "express";
import OpenAI from "openai";
import 'dotenv/config';
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());
app.listen(3500, () => {
    console.log("Servidor rodando na porta 3500");
});

const openai = new OpenAI({
    apiKey: process.env.API_KEY
});

// TESTANDO API
app.get("/", (request, response) => {
    console.log('API FOI CHAMADA.')
    response.json({
        info: "API para receitas médicas criadas pelo Chat GPT.",
    });
});

// POST /api/medicamentos
app.post("/receita", async (req, res) => {
    try {
        const { texto } = req.body;

        if (!texto) {
            return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
        }

        const prompt = `
Você é um assistente médico. Recebe um texto com nomes de medicamentos
e deve retornar um JSON estruturado contendo uma lista de objetos no formato:
[
  { "nome": "", "posologia": "", "apresentação": "", "quantidade": 0 }
]

A posologia deve seguir padrões clínicos comuns no Brasil.
Exemplo de entrada: "amoxicilina, dipirona, omeprazol"
Saída esperada: 
[
  { "nome": "Amoxicilina 500mg", "posologia": "1 cápsula a cada 8h por 7 dias", "apresentação": "cápsulas", "quantidade": 21 },
  { "nome": "Dipirona 1g", "posologia": "1 comprimido a cada 6h se dor", "apresentação" : "comprimidos", "quantidade": 20 },
  { "nome": "Omeprazol 20mg", "posologia": "1 cápsula 1x/dia por 14 dias", "apresentação": "cápsulas", "quantidade": 14 }
]

Agora gere a saída em formato JSON puro, sem comentários nem texto adicional.
Entrada do usuário: "${texto}"
Em seguida, pesquise se há alguma interação medicamentosa potencialmente grave, quando uma ou mais das medicações indicadas são usadas associadas. Se houver,
gere um JSON descrevendo a interação na propriedade "interação", como exemplificado a seguir:
{"interação":""}    
`;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const resposta = completion.choices[0].message.content;

        res.json(JSON.parse(resposta));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao processar medicações." });
    }
});
