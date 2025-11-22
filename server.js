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

// assistente de Declaração de Óbito.
app.post("/doia", async (req, res) => {
    try {
        const { texto } = req.body;

        if (!texto) {
            return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
        }

        const prompt =
            ` Você é um assistente médico especializado em declaração de óbito do Brasil.
            A partir da descrição clínica fornecida, gere a cadeia de eventos para preenchimento da Declaração de Óbito brasileira. Siga estritamente o formato JSON e as normas do Ministério da Saúde.
            ### Descrição fornecida:
            ${texto}
            
            ### Regras:
            1. Produza apenas JSON, sem texto fora do JSON.
            2. A cadeia causal deve ir da causa imediata (linha a) até a causa básica (linha d).
            3. Use no máximo 4 linhas na Parte I.
            4. Parte II deve conter apenas condições que contribuíram.
            5. Não use “parada cardiorrespiratória” ou “insuficiência respiratória” como causa básica.
            6. Não invente dados não informados.
            7. Preencha sempre a causa_basica.
            8. Estrutura JSON obrigatória:
            {
            "parte_I": {
            "a": "",
            "b": "",
            "c": "",
            "d": ""
            },
            "parte_II": [],
            "causa_basica": ""
            }
            Retorne SOMENTE o JSON.
            `

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
        });

        const resposta = completion.choices[0].message.content;

        res.json(JSON.parse(resposta));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erro ao processar solicitação." });
    }
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
