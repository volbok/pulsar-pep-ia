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
      Você é um médico especialista em preenchimento da Declaração de Óbito (DO) brasileira,
      com profundo conhecimento em causalidade médica, epidemiologia e normas do Ministério da Saúde.

      Sua tarefa é:
      Analisar um caso clínico de óbito descrito em texto livre, contido no campo ${texto}
      e identificar corretamente a cadeia de eventos que levou à morte,
      preenchendo as Partes I e II da Declaração de Óbito.

      ### REGRAS OBRIGATÓRIAS

      1. A Parte I deve conter APENAS eventos em relação de causa e efeito.
      2. A ordem da Parte I deve ser cronológica inversa:
        - I(a): causa imediata
        - I(b), I(c), I(d): causas intermediárias
        - A última linha da Parte I é SEMPRE a causa básica.
      3. A causa básica é o evento que iniciou a cadeia que levou ao óbito.
      4. Não inclua fatores de risco isolados (ex: obesidade, hipertensão, diabetes)
        na Parte I, a menos que sejam diretamente responsáveis pela morte.
      5. A Parte II deve conter condições clínicas relevantes que contribuíram para o óbito,
        mas que NÃO fazem parte direta da cadeia causal.
      6. Quando o diagnóstico não for confirmado, utilize termos como:
        "suspeito", "provável" ou "presumido", mantendo a coerência clínica.
      7. Não utilize siglas.
      8. Use linguagem médica clara, objetiva e compatível com a prática brasileira.
      9. Se a causa não puder ser determinada com segurança, indique causa mal definida,
        explicando a limitação clínica.
      10. Nunca liste causas como insuficiência respiratória aguda, parada cardiorrespiratória ou falência múltipla de órgãos.

      ### FORMATO DE SAÍDA (OBRIGATÓRIO)

      Retorne EXCLUSIVAMENTE um objeto JSON no seguinte formato:

      {
        "parte_I": [
          { "linha": "a", "descricao": "", "cid_10": "" },
          { "linha": "b", "descricao": "", "cid_10": "" },
          { "linha": "c", "descricao": "", "cid_10": "" }
        ],
        "parte_II": [
          { "descricao": "", "cid_10": "" }
        ],
        "comentarios_tecnicos": ""
      }

      - Use apenas as linhas necessárias na Parte I.
      - Não inclua texto fora do JSON.
      - O campo "comentarios_tecnicos" deve conter explicações clínicas resumidas
        para auditoria médica ou validação do sistema.

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

// evolução melhorada.
app.post("/quickmed", async (req, res) => {

  try {
    const { texto } = req.body;

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
    * SUBSTITUA SIGLAS E ABREVIAÇÕES PELAS PALAVRAS CORRETAS, CONFORME LISTA ABAIXO:
    ACV: aparelho cardiovascular.
    RR 2T ou RCR 2T = ritmo cardíaco regular, em 2 tempos.
    RCI = ritmo cardíaco irregular.
    BNF = bulhas normofonéticas.
    AP = apareho pulmonar.
    MV = murmúrio vesicular.
    MVF = murmúrio vesicular fisiológico.
    SRA = sem ruídos adventícios.
    MUC= medicações de uso contínuo.
    LOTE = lúcido, orientado no tempo e no espaço.
    Tente descobrir as que não estão listadas aqui e modifique-as por palavras completas. Se não descobir, mantenha a
    sigla ou abreviação.
    
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
    
    Se disponíveis, apenas coloque os resultados de exames laboratoriais no campo "s", sem fazer interpretação dos mesmos ou traduzi-los textualmente.
    A interpretação dos resultados dos exames laboratoriais deve ser usada para avaliar o quadro clínico e ajudar na proposição dos
    diagnósticos e condutas.

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
    Cuidado ao classificar doenças infecciosas como bacterianas ou virais. Tenha certeza de definir se uma doença
    é bacteriana ou viral antes de informar.
  
    * FORMATO DE SAÍDA:
    Use o JSON a seguir para retornar as informações levantadas e os resultados processados.

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
    res.status(500).json({ error: "Erro ao processar a evolução." });
  }

});

// evolução melhorada trabalhada com o modelo do cliente.
app.post("/quickmedplus", async (req, res) => {

  try {
    const { texto, modelo } = req.body;

    if (!modelo) {
      return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
    }

    const prompt =
      `
        IMPORTANTE — LEIA COMPLETAMENTE ANTES DE GERAR A RESPOSTA.

        1. Você receberá um JSON de entrada chamado "texto". Esse JSON contém informações clínicas estruturadas no método SOAP.
        2. Você também receberá uma string chamada "modelo", que lista os tópicos da evolução.
        3. Primeiramente, procure substituir siglas e abreviações de termos médicos encontrados na string "modelo". Abaixo tem uma lista
        de siglas e abreviações que precisam ser substituidas por expressões completas:
        ACV: aparelho cardiovascular;
        RR 2T ou RCR 2T = ritmo cardíaco regular, em 2 tempos;
        RCI = ritmo cardíaco irregular;
        BNF = bulhas normofonéticas;
        AP = apareho pulmonar;
        MV = murmúrio vesicular;
        MVF = murmúrio vesicular fisiológico;
        SRA = sem ruídos adventícios.
        MUC= medicações de uso contínuo.
        4. Siga todas as instruções da string "modelo" e busque preencher o que é solicitado com as informações correspondentes no JSON "texto".
        5. Uma vez estabelecidas as correspondências, monte uma nova array com objetos assim definidos:
        {topico: "tópico indicado na string "modelo, incluindo caracteres especiais, se presentes (hash, setas, bullets)", conteudo: conteúdo correspondente do JSON "texto"}
        6. Em seguida, adicione cada objeto criado na array evolucao, conforme mostrado no JSON a seguir:
          
          {
            "evolucao": [
              { "topico": "...", "conteudo": "..." },
              { "topico": "...", "conteudo": "..." }
            ]
          }

        7. Nunca inclua comentários, explicações, texto extra ou qualquer coisa fora do JSON final.
        8. Para tópicos que definem diagnósticos e condutas, evite textos longos, justificativas e explicações, apenas liste as respostas.

        AGORA, UTILIZE APENAS AS INFORMAÇÕES A SEGUIR:

        JSON DE ENTRADA (texto):
        ${JSON.stringify(texto)}

        MODELO DE EVOLUÇÃO (modelo):
        ${modelo}

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
    res.status(500).json({ error: "Erro ao processar a evolução com o modelo selecionado. " + error });
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
