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
    Analisar um caso clínico de óbito descrito em texto livre, contido em ${texto},
    e identificar corretamente a cadeia de eventos que levou à morte,
    preenchendo as Partes I e II da Declaração de Óbito.

    ### REGRAS OBRIGATÓRIAS:

    1. É EXPRESSAMENTE PROIBIDO utilizar sintomas, sinais clínicos ou manifestações inespecíficas como causa de morte
    ou como condição contributiva, em qualquer parte da Declaração de Óbito.

    São exemplos proibidos, entre outros:
    - tosse
    - dispneia
    - febre
    - dor
    - taquipneia
    - taquicardia
    - hipotensão
    - hipoxemia
    - dessaturação
    - parada cardiorrespiratória
    - falência múltipla de órgãos
    - insuficiência respiratória

    Sintomas e sinais devem ser usados apenas para inferência diagnóstica,
    nunca como termos finais na Parte I ou Parte II.

    2. É EXPRESSAMENTE PROIBIDO utilizar como causa de morte,
    em qualquer linha da Parte I ou II, termos genéricos ou finais de processo,
    tais como:
    - "parada cardiorrespiratória"
    - "insuficiência respiratória"
    - "falência múltipla de órgãos"
    - "fibrilação ventricular"
    - "choque" sem qualificação etiológica
    - "hipóxia", "anóxia" ou termos fisiológicos isolados
  
    Sempre que um desses eventos estiver implícito no caso clínico,
    identifique e descreva a DOENÇA ou EVENTO ETIOLÓGICO responsável.

    3. Sempre que houver:
    - foco infeccioso documentado OU fortemente sugerido
      (ex: pneumonia, infecção urinária, abdominal)
    E
    - sinais sistêmicos de resposta inflamatória ou disfunção orgânica,
      tais como:
      • hipotensão
      • taquicardia
      • taquipneia
      • febre ou hipotermia
      • hipoxemia
      • alteração do nível de consciência

    ENTÃO o diagnóstico de SEPSE deve ser considerado prioritário.
    Se houver hipotensão persistente associada à sepse,
    o choque deve ser classificado obrigatoriamente como CHOQUE SÉPTICO,
    nunca como hipovolêmico, salvo descrição explícita de perda volêmica.

    4. A Parte I deve conter APENAS eventos em relação direta de causa e efeito.
    A ordem da Parte I deve ser cronológica inversa:
    - I(a): causa imediata
    - I(b), I(c), I(d): causas intermediárias
    - A última linha da Parte I é SEMPRE a causa básica.
    A causa básica é o evento que iniciou a cadeia que levou ao óbito. 
    
    5. Não inclua fatores de risco isolados ou doenças crônicas preexistentes (ex: obesidade, hipertensão, diabetes).
      na Parte I, a menos que sejam diretamente responsáveis pela morte.
    
    6. Não inclua na Parte I nem na Parte II resultados ou descrições de exames, apenas use-os na interpretação do caso. 
    
    7. A Parte II deve conter condições clínicas relevantes que contribuíram para o óbito,
    mas que NÃO fazem parte direta da cadeia causal.
    
    8. Quando o diagnóstico não for confirmado, utilize termos como:
    "suspeito", "provável" ou "presumido", mantendo coerência clínica.
    
    9. Não utilize siglas.
    
    10. Utilize linguagem médica clara, objetiva e compatível com a prática brasileira.
    
    11. Se a causa não puder ser determinada com segurança,
        declare causa mal definida e justifique a limitação clínica.
    
    ### FORMATO DE SAÍDA (OBRIGATÓRIO):

    Retorne EXCLUSIVAMENTE um objeto JSON no seguinte formato:

    {
      "parte_I": [
        { "linha": "a", "descricao": "", "cid10": "" },
        { "linha": "b", "descricao": "", "cid10": "" },
        { "linha": "c", "descricao": "", "cid10": "" }
      ],
      "parte_II": [
        { "descricao": "", "cid10": "" }
      ],
      "comentarios_tecnicos": ""
    }

    - Utilize apenas as linhas necessárias na Parte I.
    - Não inclua texto fora do JSON.
    - O campo "comentarios_tecnicos" deve conter justificativa clínica sucinta
      para fins de auditoria médica e validação do sistema.

    - Antes de entregar a resposta, revise se a mesma cumpre todas as regras acima definidas e corrija inconsistências.
      Nunca coloque parada cardiorrespiratória ou insuficiência respiratória na resposta!

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

// evolução melhorada trabalhada com o modelo do cliente.
app.post("/quickmedpersonal", async (req, res) => {

  try {
    const { texto, modelo } = req.body;
    if (!modelo) {
      return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
    }

    const prompt =
      `
        Leia integralmente este prompt antes de gerar a resposta.

        Você é um médico experiente, com amplo domínio de documentação clínica, prontuário eletrônico e diferentes estilos de evolução médica hospitalar.

        Você receberá:
        1) Um texto bruto de evolução médica, copiado diretamente de um prontuário eletrônico, contendo informações possivelmente desorganizadas, repetidas ou fora de ordem.
        2) Um MODELO DE EVOLUÇÃO definido pelo usuário, que determina:
          - os nomes dos tópicos
          - a ordem dos tópicos
          - o estilo da evolução

        ========================
        TEXTO ORIGINAL DA EVOLUÇÃO:
        ${texto}
        ========================

        ========================
        MODELO DE EVOLUÇÃO DESEJADO:
        ${modelo}
        ========================

        ### SUA TAREFA:

        1. Interpretar o conteúdo clínico do texto original, identificando as informações relevantes para cada tópico do MODELO.
            Substituir siglas e abreviações de termos médicos encontrados na string "texto", quando identificáveis com certeza. Abaixo tem uma lista
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
            NÃO substitua siglas ou abreviações que desconhece. NÃO substitua unidades de medida de resultados laboratoriais. 

        2. Remodelar a evolução médica conforme o MODELO fornecido, respeitando rigorosamente:
          - os nomes dos tópicos
          - a ordem dos tópicos

        3. NÃO criar, inferir ou corrigir informações clínicas.
          - Não incluir diagnósticos, exames ou condutas que não estejam explicitamente mencionados no texto original.
          - Se algum tópico do MODELO não tiver informação correspondente no texto original, utilize exatamente o texto:
            "Não informado no registro original."

        4. Aprimorar exclusivamente a forma de escrita:
          - correção gramatical e ortográfica
          - clareza, concisão e linguagem médica adequada
          - eliminação de repetições e trechos confusos
          - sem alterar o significado clínico

        5. NÃO incluir comentários, explicações ou qualquer texto fora da estrutura solicitada.

        6. ### FORMATAÇÃO DE LISTAS EM CAMPOS DE TEXTO
          Alguns campos do JSON devem representar **listas de itens**, porém mantendo o tipo STRING.

          Para esses campos:
          - Cada item deve ser apresentado em uma nova linha.
          - Não deixe itens sem pontuação final.
          - Utilize obrigatoriamente o caractere de quebra de linha "\n" entre os itens.
          - Não utilizar marcadores como "-", "•" ou numeração.
          - Não transformar esses campos em arrays.

          Os campos que devem seguir este padrão são:
          - hipóteses diagnósticas
          - exames complementares
          - condutas
          - planos terapêuticos
          - quaisquer outros campos do modelo do usuário que representem listas clínicas

        ### FORMATO OBRIGATÓRIO DA RESPOSTA

        Retorne exclusivamente um JSON válido, exatamente neste formato:

        {
          "evolucao": [
            {
              "topico": "NOME_DO_TOPICO_1",
              "conteudo": "Texto correspondente a este tópico."
            },
          ]
        }

        ### REGRAS IMPORTANTES:
        - Os valores de "topico" devem ser **idênticos** aos nomes fornecidos no MODELO.
        - A ordem dos objetos na array "evolucao" deve ser **exatamente a mesma** do MODELO.
        - Não incluir campos extras.
        - Não incluir texto fora do JSON.
        - O JSON deve ser estritamente válido (aspas, vírgulas, colchetes).

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

// evolução melhorada trabalhada com o modelo do cliente.
app.post("/quickmedprescricao", async (req, res) => {

  try {
    const { texto } = req.body;

    if (!texto) {
      return res.status(400).json({ error: "Campo 'texto' é obrigatório." });
    }

    const prompt =
      `
     Leia integralmente este prompt antes de gerar a resposta.

      Você é um médico experiente, atuante no Brasil, com amplo domínio de terapêutica clínica e prescrição hospitalar na prática cotidiana de UPAs, pronto-socorros e enfermarias.

      Você receberá informações clínicas fornecidas por um médico usuário, contendo:
      - quadro clínico
      - hipóteses diagnósticas ou diagnósticos
      - sinais vitais
      - dados relevantes de exame físico e exames complementares

      ========================
      INFORMAÇÕES CLÍNICAS DO CASO:
      ${texto}
      ========================

      ### SUA TAREFA:

      1. Avaliar o quadro clínico apresentado.

      2. Sugerir uma **prescrição hospitalar compatível com a prática médica brasileira**, utilizando:
        - medicamentos amplamente disponíveis no SUS e na rede privada
        - nomes em DCB
        - esquemas usuais e reconhecidos na rotina hospitalar

      3. Priorizar clareza e utilidade prática.
        - Evitar fármacos pouco utilizados no Brasil.
        - Evitar diluições vagas ou excessivamente genéricas.
        - Quando houver mais de uma opção válida, sugerir **duas ou três alternativas comuns**.

      ---

      ### ESTRUTURA DA PRESCRIÇÃO (OBRIGATÓRIA)

      A resposta deve seguir **exatamente** a estrutura abaixo:

      {
        "dieta": "",
        "dados_vitais": "",
        "analgesia": "",
        "antiemetico": "",
        "protetor_gastrico": "",
        "anticoagulacao": "",
        "insulinoterapia": "insulina regular SC conforme protocolo glicêmico"
        "glicose": "SGH 50% se glicemia capilar < 70mg/dl"
        "antibioticoterapia": "",
        "soroterapia": "",
        "aminas_vasoativas" : "",
        "itens_especificos": [
          {
            "item": "",
            "posologia": ""
          }
        ]
      }

      ---

      ### ORIENTAÇÕES PARA CADA CAMPO:

      - **dieta**  
        Sugira opções comuns como: dieta zero, dieta branda, dieta oral conforme aceitação.

      - **dados_vitais**  
        Utilize linguagem hospitalar padrão brasileira  
        (ex.: “Aferir FC, FR, PA, SpO₂ e temperatura a cada 6–12h”).

      - **analgesia**  
        Sugira 2 ou 3 opções usuais no Brasil, como:  
        dipirona, paracetamol, tramadol (se pertinente).

      - **antiemetico**  
        Sugira opções comuns, como:  
        metoclopramida, ondansetrona.

      - **protetor_gastrico**  
        Utilize preferencialmente:  
        omeprazol ou pantoprazol.

      - **anticoagulacao**  
        Sugira profilaxia quando clinicamente indicada, usando:  
        heparina não fracionada ou enoxaparina.  
        Indicar anticoagulação plena nos casos indicados (infarto agudo do miocárdio, fibrolação atrial, trombose venosa profunda e/ou embolia pulmonar).
        Não prescrever se houver contraindicação evidente no texto.

      - **antibioticoterapia**  
        Preencher **apenas se houver indicação clínica explícita ou fortemente sugerida**.  
        Utilizar antibióticos comuns na prática brasileira  
        (ex.: ceftriaxona, amoxicilina-clavulanato, azitromicina, piperacilina-tazobactam).  
        Se não indicada, deixar campo vazio ("").

      - **soroterapia**  
        A sugestão de soroterapia deve ser baseada exclusivamente nos dados clínicos informados no texto de entrada.
        Antes de sugerir a soroterapia, identifique se o paciente se enquadra em um ou mais dos seguintes cenários clínicos:

        1. Dieta suspensa ou ingestão oral inadequada
        2. Desidratação clínica ou laboratorial
        3. Hipovolemia ou instabilidade hemodinâmica
        4. Sepse ou suspeita de sepse
        5. Manutenção hospitalar sem perdas significativas
        6. Ausência de indicação clara para soroterapia

        ### CONDUTA PARA CADA CENÁRIO:

        - **Dieta suspensa / Jejum**
          - Priorizar soroterapia de manutenção
          - Opções usuais na prática brasileira:
            - SG 5%
            - SG 5% + eletrólitos, se indicado

        - **Desidratação**
          - Priorizar reposição volêmica
          - Opções usuais:
            - SF 0,9%
            - Ringer Lactato
          - Ajustar volume conforme gravidade descrita no texto

        - **Hipovolemia / Instabilidade hemodinâmica**
          - Priorizar expansão volêmica
          - Opções usuais:
            - SF 0,9%
            - Ringer Lactato
          - Evitar soluções glicosadas como primeira escolha

        - **Sepse ou suspeita de sepse**
          - Priorizar cristalóides isotônicos
          - Opções usuais:
            - SF 0,9%
            - Ringer Lactato
          - Não sugerir coloides
          - Não sugerir SG 5% isoladamente

        - **Manutenção hospitalar**
          - Sugestão conforme rotina:
            - SF 0,9%
            - SG 5%, conforme tolerância e quadro clínico

        - **Ausência de indicação clara**
          - Omitir soroterapia ou indicar apenas:
            "Manter hidratação conforme aceitação oral"

        ### REGRAS IMPORTANTES PARA SOROTERAPIA:

        - Utilizar apenas soluções amplamente usadas no Brasil.
        - Não sugerir volumes extremamente específicos, salvo se descritos no texto.
        - Não sugerir reposição eletrolítica complexa sem dados laboratoriais.
        - Não sugerir soroterapia se houver contraindicação evidente descrita no caso.
        - A soroterapia deve ser coerente com dieta, sinais vitais e diagnóstico.

        O campo "soroterapia" deve conter uma descrição clara e prática, como por exemplo:
        "SF 0,9% para manutenção"
        "Ringer Lactato para reposição volêmica"
        "SG 5% enquanto dieta suspensa"

      - **aminas vasoativas**  
      
        ### AVALIAÇÃO E INDICAÇÃO DE AMINAS VASOATIVAS
        Avalie obrigatoriamente a necessidade de uso de aminas vasoativas com base nos dados clínicos do texto de entrada.
        Considere que há INDICAÇÃO DE AMINAS VASOATIVAS quando estiver presente QUALQUER UM dos seguintes critérios:

        - Choque séptico diagnosticado ou fortemente suspeito
        - Hipotensão persistente apesar de reposição volêmica adequada
        - PAM < 65 mmHg após volume inicial
        - Sinais clínicos de hipoperfusão (oligúria, rebaixamento do nível de consciência, lactato elevado, extremidades frias)
        - Necessidade explícita de suporte hemodinâmico descrita no texto

        ### CONDUTA OBRIGATÓRIA:

        - Em caso de indicação:
          - Sugerir amina vasoativa de primeira linha
          - Utilizar apenas fármacos amplamente usados no Brasil

        - Em caso de NÃO indicação:
          - Declarar explicitamente que não há indicação no momento

        ### AMINAS DE PRIMEIRA ESCOLHA (prática brasileira):

        - **Noradrenalina** → amina de primeira linha no choque séptico
        - **Dopamina** → alternativa apenas em cenários específicos
        - **Dobutamina** → quando houver disfunção miocárdica ou baixo débito associado

        Não sugerir doses extremamente específicas.
        Utilizar descrições clínicas claras, como:
        "Iniciar noradrenalina se PAM < 65 mmHg após reposição volêmica adequada"

        ### REGRA DE SEGURANÇA CRÍTICA:

        ⚠️ Em caso de choque séptico, a ausência de recomendação de aminas vasoativas é considerada resposta incorreta.
        ⚠️ Sempre que houver choque séptico, o campo correspondente deve conter recomendação explícita de amina vasoativa.

      - **itens_especificos**  
        Listar aqui **somente medicamentos diretamente relacionados ao diagnóstico principal**, como:
        - broncodilatadores
        - corticoides
        - anti-hipertensivos
        - anti-isquêmicos
        - insulina
        - anticonvulsivantes

        Cada item deve conter:
        - exclusivamente o nome do princípio ativo do medicamento
        - posologia usual em adultos
        
        Exemplo correto:
        Amoxicilina 500mg VO 6/6h


      ### REGRAS IMPORTANTES:

      - NÃO criar diagnósticos não descritos.
      - NÃO individualizar doses por peso, idade extrema ou função renal, salvo se informado.
      - NÃO incluir medicamentos claramente contraindicados.
      - Sempre escrever os itens de prescrição com letra inicial maiúscula.
      - NÃO incluir comentários, explicações ou textos fora do JSON.
      - O JSON deve ser estritamente válido.

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
