/**
 * Portuguese (pt-BR) UI copy. Mirrors the shape of en.ts.
 * DRAFT — machine-drafted; review with a native speaker before field use.
 * For UI chrome only; the AI itself responds in Portuguese via languageName().
 */

export const pt = {
  common: {
    back: 'Voltar',
    next: 'Avançar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    done: 'Concluído',
    edit: 'Editar',
    optional: 'opcional',
    skip: 'Pular',
    continue: 'Continuar',
  },
  beginConsent: {
    yes: 'Sim, começar',
    questions: 'Tenho perguntas primeiro',
    no: 'Não, prefiro não',
    declinedHeading: 'Obrigado pelo seu tempo.',
    declinedBody:
      'Não guardaremos nenhum registro disto. Se mudar de ideia mais tarde, você pode sempre voltar.',
  },
  demographics: {
    heading: 'Algumas perguntas rápidas antes de começar',
    intro:
      'Tudo isto é opcional. Pule qualquer coisa que preferir não compartilhar. Usamos isto para garantir que vozes diferentes apareçam no que é relatado — nunca para identificar você.',
    languageLabel: 'Idioma para esta conversa',
    relationshipLabel: 'Como você está ligado à área',
    genderLabel: 'Gênero',
    indigenousLabel: 'Você se identifica como indígena?',
    indigenousFollowupLabel:
      'Qual povo, nação ou comunidade? (opcional)',
    indigenousFollowupHint:
      'ex.: Guarani, Sami, Adivasi, Quechua, Iorubá, Maori, Lumad, San — como quer que vocês se chamem.',
    ageLabel: 'Faixa etária',
    submit: 'Continuar para a conversa',
    skipAll: 'Pular e continuar',
    selfDescribePlaceholder: 'Como você descreveria?',
    options: {
      language: {
        en: 'English',
        es: 'Español',
        olelo: 'ʻŌlelo Hawaiʻi (em breve)',
        other: 'Outro idioma',
      },
      relationship: {
        lives_immediate: 'Moro na área imediata',
        lives_nearby: 'Moro por perto',
        works_or_business: 'Trabalho ou tenho um negócio aqui',
        family_or_land: 'Estou ligado por família ou terra',
        visiting: 'Estou de visita',
        other: 'Outro',
        prefer_not_to_say: 'Prefiro não dizer',
      },
      gender: {
        woman: 'Mulher',
        man: 'Homem',
        nonbinary: 'Não binário',
        two_spirit: 'Dois-espíritos',
        genderqueer: 'Genderqueer',
        trans_woman: 'Mulher trans',
        trans_man: 'Homem trans',
        self_describe: 'Prefiro me autodescrever',
        prefer_not_to_say: 'Prefiro não dizer',
      },
      indigenous: {
        yes: 'Identifico-me como indígena',
        no: 'Não me identifico como indígena',
        prefer_not_to_say: 'Prefiro não dizer',
      },
      age: {
        '18_24': '18–24',
        '25_34': '25–34',
        '35_49': '35–49',
        '50_64': '50–64',
        '65_plus': '65+',
        prefer_not_to_say: 'Prefiro não dizer',
      },
    },
  },
  language: {
    pickHeading: 'Escolha um idioma para começar',
    pickSub:
      'A Pythia falará com você no idioma que você escolher. Você pode mudar a qualquer momento recomeçando.',
    en: 'English',
    es: 'Español',
  },
  start: {
    back: '← Voltar',
    tag: 'Comunidade',
    h: 'Antes de começarmos',
    languageLabel: 'Idioma da conversa',
    modeLabel: 'Como você gostaria de participar?',
    modeType: 'Digitar minhas respostas',
    modeVoice: 'Falar minhas respostas (a Pythia lê em voz alta e ouve)',
    intro:
      'Você está prestes a ter uma conversa privada com a Pythia. A Pythia é uma assistente de IA que ouve pessoas nas comunidades sobre projetos de energia limpa propostos. A conversa é voluntária — você pode parar, pular qualquer pergunta ou se recusar a responder a qualquer momento. Nada do que você disser será compartilhado com ninguém a menos que você dê permissão explícita no final.',
    begin: 'Iniciar conversa',
  },
  chat: {
    placeholder: 'Digite sua resposta…',
    placeholderFirstTurn: 'O que você acha do projeto de energia proposto — ou pergunte primeiro qualquer coisa à Pythia…',
    send: 'Enviar',
    wrapUp: 'Gostaria de encerrar',
    pythiaIsTyping: 'A Pythia está ouvindo…',
    error: 'Algo deu errado. Tente novamente ou atualize a página.',
    firstTurnHint:
      'Compartilhe o que você pensa sobre o projeto de energia proposto perto de você — preocupações, perguntas, esperanças ou qualquer outra coisa que esteja em sua mente. Não há resposta certa nem roteiro. Você também pode simplesmente fazer uma pergunta à Pythia primeiro. Clique em "Gostaria de encerrar" quando estiver pronto.',
  },
  recap: {
    heading: 'Aqui está o que eu entendi',
    intro:
      'Reserve um momento para reler isto. Diga-me se entendi algo errado ou se há algo a acrescentar.',
    correct: 'Sim, está certo',
    edit: 'Gostaria de corrigir ou acrescentar algo',
  },
  consent: {
    heading: 'O que podemos compartilhar, e com quem?',
    intro:
      'Você decide o que — se é que algo — sai desta conversa. Escolha o que fizer sentido. Você também pode não compartilhar nada, e a Pythia guardará o que você disse apenas para a sua própria cópia.',
    shareDeveloper: 'Compartilhar com a empresa desenvolvedora do projeto',
    shareDeveloperHelp:
      'Em um relatório privado. Ajuda a empresa a entender as visões da comunidade.',
    shareFunder: 'Compartilhar com os financiadores ou investidores do projeto',
    shareFunderHelp: 'Em um resumo separado. Mesmo conteúdo, público diferente.',
    sharePublic: 'Incluir no relatório público da Pythia',
    sharePublicHelp: 'Usado para informar políticas e práticas mais amplas. Sem detalhes identificáveis.',
    identification: 'Se algo for compartilhado, como deve se referir a você?',
    identificationHelp:
      'Você pode permanecer completamente anônimo ou se descrever como quiser — um pseudônimo, um papel como "um inquilino perto do local", ou o que parecer certo. A escolha é sua.',
    idAnonymous: 'Anônimo',
    idAnonymousHelp: 'Apenas "um participante da comunidade" — sem outros detalhes.',
    idSelfDescribed: 'Identifique-me — eu direi como',
    idSelfDescribedHelp:
      'Você escolhe o descritor. Pode ser um pseudônimo, um papel ou qualquer outra coisa que quiser.',
    idDescriptionPlaceholder:
      'ex.: "Maya", "um agricultor perto do local", "uma anciã indígena"',
    notes: 'Qualquer outra coisa que você queira que saibamos sobre como tratar o que você compartilhou',
    submit: 'Salvar minhas permissões',
  },
  advocacy: {
    heading: 'Para você — o que você disse e como isso pode ajudar',
    intro:
      'Um breve resumo que você pode guardar, compartilhar ou usar para defender a si mesmo. Isto é seu. A Pythia não precisa de mais nada de você.',
    done: 'Terminei',
  },
  panels: {
    map: {
      heading: 'Marque no mapa o que é importante para você',
      intro:
        'Toque em qualquer lugar para colocar um alfinete. Para cada alfinete, você pode adicionar um rótulo e uma nota. Isso nos ajuda a entender ONDE estão suas preocupações específicas, não apenas quais são.',
      submit: 'Salvar meus alfinetes',
      skip: 'Pular o mapa e continuar',
      labelPlaceholder: 'Rótulo curto (ex.: "ruído", "sítio cultural")',
      notePlaceholder: 'Por que este lugar é importante?',
    },
    photo: {
      heading: 'Se quiser, compartilhe uma ou mais fotos',
      intro:
        'Às vezes uma foto conta o que as palavras não conseguem. Compartilhe o que é importante para você neste lugar — opcional. Cada foto pode ter uma breve nota.',
      add: 'Mostre-nos em uma foto o que você quer proteger',
      captionPlaceholder: 'O que há nesta foto? Por que é importante?',
      submit: 'Salvar minhas fotos',
      skip: 'Pular fotos e continuar',
    },
    stanceQ: {
      heading: 'Uma pergunta sobre o projeto',
      intro: 'Opcional — ajuda a ver se a conversa muda algum ponto de vista.',
    },
  },
};

export type CopyPT = typeof pt;
