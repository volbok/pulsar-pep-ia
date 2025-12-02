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
  console.log('API FOI CHAMADA.');
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

app.post("/quickmed", async (req, res) => {

  try {
    const { texto, modelo } = req.body;

    if (!texto) {
      return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
    }

    const prompt =
      `
    Você é um assistente clínico especializado em transformar descrições livres de casos médicos em um registro estruturado no formato SOAP, seguindo rigor técnico, coerência médica e segurança do paciente.
    Todas as informações fornecidas estarão em ${texto}.
    
    OBJETIVO FINAL:
    A partir de um texto livre descrevendo uma consulta, atendimento ou plantão, gere:
    S - Subjective (História e queixa do paciente).
    O - Objective (Exame físico e exames complementares).
    A - Assessment (Avaliação + hipóteses diagnósticas, graduadas por gravidade e probabilidade).
    P - Plan (Condutas, tratamento, monitoramento, red flags).
    
    Além disso, gere:
    Exames complementares sugeridos (se aplicável).
    Diagnósticos diferenciais relevantes.
    Alertas de segurança / red flags.
    Checklist de alta ou de reavaliação (se aplicável).

    INSTRUÇÕES IMPORTANTES:
    * CLASSIFICAÇÃO OBRIGATÓRIA DOS ITENS:
    Cada elemento do texto deve ser categorizado corretamente como:
    Sintoma.
    Sinal clínico.
    Diagnóstico.
    Resultado de exame complementar.
    Antecedente / comorbidade.
    Medicação em uso.
    Achado acidental sem relevância.
    Informação irrelevante.

    * SEPARAÇÃO RÍGIDA ENTRE EXAME CLÍNICO E EXAMES COMPLEMENTARES:
    No campo Objective, faça duas seções:
    Exame físico.
    Exames complementares (laboratoriais, imagem, ECG etc.).

    * HÍSTÓRIA E QUEIXA DO PACIENTE (S - Subjective):
    Procure escrever a história da doença atual de forma mais detalhada, indicando o tempo de início do quadro atual (se
    indisponível, não invente), bem como os sinais e sintomas apresentados.

    * AVALIAÇÃO (A - Assessment):
    a. Diagnósticos mais prováveis.
    b. Diagnósticos diferenciais graves a excluir. Cuidado para não repetir aqui diagnósticos semelhantes àqueles sugeridos
    como diagnósticos mais prováveis (item a).
    c. Condições relacionadas ou potencialmente precipitantes.
 
    * PLANO TERAPÊUTICO (P - Plan):
    Inclua, quando aplicável:
    Tratamento imediato.
    Medicações recomendadas com dose, via e frequência.
    Condutas de suporte (O2, hidratação etc.).
    Exames a serem solicitados agora.
    Riscos a monitorar.
    Critérios de reavaliação.
    Critérios de alta.
    Sempre apresentar o plano como sugestão ao médico, nunca como prescrição definitiva.
    
    Antes de propor uma medicação ou tratamento, checar se algum resultado de exame complementar ou achado no exame
    físico podem estar contra-indicados.
    Por exemplo, sugerir anti-hipertensivo para um paciente com hipotensão está contra-indicado.
    Da mesma forma, não se deve sugerir uso de nitrato em paciente com infarto agudo da parede inferior do miocárdio.

    * TONS E LIMITES:
    - Seja técnico, direto e objetivo.
    - Não use linguagem coloquial.
    - Tente converter todas as siglas, como EAP, PNM, IAM, para a nomenclatura completa (respectivamente Edema Agudo de Pulmão, Pneumonia, Infarto Agudo do Miocárdio, nos exemplos dados).
    - Não dê opinião jurídica.
    - Não substitua o julgamento clínico.

    * REGRAS DE SEGURANÇA:
    Nunca invente dados não fornecidos, bem como resultados de exames complementares ou achados do exame físico.
    Não prescreva substâncias proibidas.
    Medicações sempre devem estar em forma de sugestão.
    Em pediatria, só utilize doses padrão comprovadas.
    Não conclua diagnósticos que dependam exclusivamente de exames não fornecidos.
  
    * FORMATO DE SAÍDA:
    Use o JSON a seguir para retornar as informações levantadas e os resultados processados.
    No campo "evolução" do JSON, adapte todas as informações processadas ao modelo de evolução contextualizado em ${modelo}.
    Este modelo traz formas personalizadas de arranjar as informações do SOAP, permitindo que o usuário médico crie evoluções
    personalizadas.
    {
      "s": {
          "queixa_principal": "",
          "historia_doenca_atual": "",
          "antecedentes_pessoais": "",
          "medicacoes_previas": ""
      },
      "o": {
          "exame_fisico": "",
          "exames_laboratorio": "",
          "exames_imagem": "",
          "outros_exames": ""
      },
      "a": {
          "diagnosticos_provaveis": "",
          "diagnosticos_diferenciais": "",
          "condicoes_relacionadas_precipitantes": ""
      },
      "p": {
          "tratamento_imediato": "",
          "medicacoes_recomendadas": "",
          "condutas_suporte": "",
          "exames_solicitar": "",
          "riscos_monitorar": "",
          "criterios_reavaliacao": "",
          "criterios_internacao": "",
          "criterios_alta": ""
      },
      "evolucao: {

      }
    } 
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
    res.status(500).json({ error: "Erro ao processar medicações." });
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
