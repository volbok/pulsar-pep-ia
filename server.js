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
      `      
Você recebe informações clínicas (diagnósticos, sinais, sintomas, achados, exames e antecedentes mórbidos) e deve produzir exclusivamente
a cadeia de causas de óbito (Parte I da Declaração de Óbito) e as outras condições significativas (Parte II) em formato JSON.

Origem das informações: ${texto}

Para cada causa identificada, indique se o mesmo se trata de um sinal, sintoma, achado laboratorial ou diagnóstico etiológico,
sindrômico ou nosológico. Dê um "peso" para cada causa, conforme a chance ou rapidez de causar óbito, e liste o resultado
dessa análise na propriedade "classificação" do JSON de resposta. O peso pode variar de 0 a 10.

Liste em seguida as causas do maior peso para o menor peso, e em seguida verifique se cada item poderia ser causador do item
com peso imediatamente maior. Se afirmativo, classifique-o no JSON como causador: sim, do contrário, classifique-o como causador: não.
Itens classificados como não causadores devem ser considerados como contribuidores da morte, fatores complicadores, e devem ser
informados na parte II da resposta.

No caso de existirem causas como choque e sepse, dar mais peso ao choque.

Não invente diagnósticos, descubra os diagnósticos mais plausíveis baseando-se exclusivamente nas informações disponibilizadas.
Se não tem certeza, não liste o diagnóstico.

Verifique também se existem diagnósticos etiológicos ou nosológicos semelhantes (códigos CID parecidos) e exclua o menos específico.

Não é necessário preencher todas as linhas da parte I, liste apenas os diagnósticos de maior probabilidade. A parte I aceita
no máximo 4 linhas.

Reserve para a parte II as doenças crônicas, que geralmente já foram lançadas pelo usuário, ou para causas agudas, contribuidoras
para a morte, mas que não se enquadram adequadamente na cadeia causal direta da morte.

Não use causas como "insuficiência respiratória", "parada cardiorrespiratória" ou "falência múltipla de órgãos".

Ao listar cada item, associe-o ao CID-10.

Formato da resposta (obrigatório).
Retorne apenas o JSON, exatamente neste formato:

"classificacao": [
{
"item": "",
"classificacao" : "",
"peso": 0,
"causador": "",
},
],

    "parteI": [
        {
            "item": "",
            "cid10": "",
        },
    "parteII": [
        {
            "item": "",
            "cid10": "",
        }

Não inclua explicações, comentários, textos adicionais ou variações de formato.
A resposta deve ser exclusivamente o JSON.
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
// api key.
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
