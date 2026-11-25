/**
 * Spanish UI copy.
 *
 * Pythia responds in Spanish when language='es'. This file is the UI chrome.
 */

import { CopyEN } from './en';

export const es: CopyEN = {
  common: {
    back: 'Atrás',
    next: 'Siguiente',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    done: 'Listo',
    edit: 'Editar',
    optional: 'opcional',
    skip: 'Omitir',
    continue: 'Continuar',
  },
  beginConsent: {
    yes: 'Sí, empezar',
    questions: 'Tengo preguntas primero',
    no: 'No, prefiero no hacerlo',
    declinedHeading: 'Gracias por su tiempo.',
    declinedBody:
      'No vamos a guardar nada de esta visita. Si cambia de opinión más adelante, siempre puede volver.',
  },
  demographics: {
    heading: 'Unas cosas rápidas antes de empezar',
    intro:
      'Todo esto es opcional. Puede omitir cualquier cosa que prefiera no compartir. Usamos esto para asegurarnos de que voces diferentes se reflejen en lo que se reporta — nunca para identificarle.',
    languageLabel: 'Idioma para esta conversación',
    relationshipLabel: 'Cómo está conectada/o con el área',
    genderLabel: 'Género',
    indigenousLabel: '¿Se identifica como Indígena?',
    indigenousFollowupLabel:
      '¿Qué pueblo, nación o comunidad? (opcional)',
    indigenousFollowupHint:
      'p. ej., Nativo Hawaiano, Sami, Adivasi, Quechua, Yoruba, Maori, Lumad, San — como sea que ustedes se llamen.',
    ageLabel: 'Rango de edad',
    submit: 'Continuar a la conversación',
    skipAll: 'Omitir y continuar',
    selfDescribePlaceholder: '¿Cómo lo describiría?',
    options: {
      language: {
        en: 'English',
        es: 'Español',
        olelo: 'ʻŌlelo Hawaiʻi (próximamente)',
        other: 'Otro idioma',
      },
      relationship: {
        lives_immediate: 'Vivo en el área inmediata',
        lives_nearby: 'Vivo cerca',
        works_or_business: 'Trabajo o tengo un negocio aquí',
        family_or_land: 'Estoy conectado por familia o tierra',
        visiting: 'Estoy de visita',
        other: 'Otra cosa',
        prefer_not_to_say: 'Prefiero no decir',
      },
      gender: {
        woman: 'Mujer',
        man: 'Hombre',
        nonbinary: 'No binario',
        two_spirit: 'Two-Spirit',
        genderqueer: 'Genderqueer',
        trans_woman: 'Mujer trans',
        trans_man: 'Hombre trans',
        self_describe: 'Quisiera describirlo yo',
        prefer_not_to_say: 'Prefiero no decir',
      },
      indigenous: {
        yes: 'Me identifico como Indígena',
        no: 'No me identifico como Indígena',
        prefer_not_to_say: 'Prefiero no decir',
      },
      age: {
        '18_24': '18–24',
        '25_34': '25–34',
        '35_49': '35–49',
        '50_64': '50–64',
        '65_plus': '65+',
        prefer_not_to_say: 'Prefiero no decir',
      },
    },
  },
  language: {
    pickHeading: 'Elija un idioma para comenzar',
    pickSub:
      'Pythia conversará con usted en el idioma que elija. Puede cambiarlo en cualquier momento volviendo a empezar.',
    en: 'English',
    es: 'Español',
  },
  start: {
    back: '← Atrás',
    tag: 'Comunidad',
    h: 'Antes de comenzar',
    languageLabel: 'Idioma de la conversación',
    modeLabel: '¿Cómo prefiere participar?',
    modeType: 'Escribir mis respuestas',
    modeVoice: 'Hablar mis respuestas (Pythia habla y escucha)',
    intro:
      'Está por tener una conversación privada con Pythia. Pythia es un asistente de inteligencia artificial que escucha a personas de comunidades sobre proyectos de energía limpia propuestos. La conversación es voluntaria — puede detenerla, omitir cualquier pregunta o negarse a contestar en cualquier momento. Nada de lo que diga se compartirá con nadie a menos que usted lo autorice explícitamente al final.',
    begin: 'Comenzar la conversación',
  },
  chat: {
    placeholder: 'Escriba su mensaje…',
    placeholderFirstTurn: 'Comparta lo que piensa, o haga una pregunta primero…',
    send: 'Enviar',
    wrapUp: 'Quisiera terminar',
    pythiaIsTyping: 'Pythia está escuchando…',
    error: 'Algo salió mal. Intente de nuevo o recargue la página.',
    firstTurnHint:
      'Cuando esté lista/o — comparta lo que piensa, o pregúntele algo a Pythia primero. No hay un guion. También puede hacer clic en "Quisiera terminar" en cualquier momento.',
  },
  recap: {
    heading: 'Esto es lo que escuché',
    intro:
      'Tómese un momento para leerlo. Dígame si entendí algo mal o si hay algo que agregar.',
    correct: 'Sí, está bien',
    edit: 'Quisiera corregir o agregar algo',
  },
  consent: {
    heading: '¿Qué podemos compartir, y con quién?',
    intro:
      'Usted decide qué — si algo — sale de esta conversación. Elija lo que le parezca correcto. También puede no compartir nada, y Pythia conservará lo que dijo solo para su propio registro.',
    shareDeveloper: 'Compartir con la empresa que propone el proyecto',
    shareDeveloperHelp:
      'En un informe privado. Ayuda a la empresa a entender las opiniones de la comunidad.',
    shareFunder: 'Compartir con quienes financian o invierten en el proyecto',
    shareFunderHelp: 'En un informe aparte. Mismo contenido, otro público.',
    sharePublic: 'Incluir en el informe público de Pythia',
    sharePublicHelp:
      'Se usa para informar políticas y prácticas más amplias. Sin datos que lo identifiquen.',
    identification: 'Si se comparte algo, ¿cómo debería referirse a usted?',
    identificationHelp:
      'Puede permanecer completamente anónima/o, o describirse como quiera — un seudónimo, un rol como "una persona que alquila cerca del sitio," o lo que se sienta correcto. Usted decide.',
    idAnonymous: 'Anónimo',
    idAnonymousHelp: 'Solo "una persona de la comunidad" — sin otros detalles.',
    idSelfDescribed: 'Identifíqueme — yo describo cómo',
    idSelfDescribedHelp:
      'Usted elige el descriptor. Puede ser un seudónimo, un rol, o cualquier otra cosa que quiera.',
    idDescriptionPlaceholder:
      'p. ej., "Maya," "un agricultor cerca del sitio," "una anciana Indígena"',
    notes: 'Cualquier cosa que quiera que sepamos sobre cómo manejar lo que compartió',
    submit: 'Guardar mis permisos',
  },
  advocacy: {
    heading: 'Para usted — lo que dijo y cómo podría ayudarle',
    intro:
      'Un resumen breve que puede guardar, compartir o usar para defender sus intereses. Esto es suyo. Pythia no necesita nada más de usted.',
    done: 'He terminado',
  },
  panels: {
    map: {
      heading: 'Marque el mapa con sus preocupaciones',
      intro:
        'Toque cualquier lugar para colocar un alfiler. Para cada alfiler, puede agregar una etiqueta y una nota. Esto nos ayuda a entender dónde están sus preocupaciones específicas, no solo qué son.',
      submit: 'Guardar mis alfileres',
      skip: 'Saltar el mapa y continuar',
      labelPlaceholder: 'Etiqueta corta (p. ej., "ruido", "sitio cultural")',
      notePlaceholder: '¿Por qué importa este lugar?',
    },
    photo: {
      heading: 'Si quiere, comparta una o más fotos',
      intro:
        'A veces una foto cuenta lo que las palabras no pueden. Comparta lo que importa para usted en este lugar — opcional. Cada foto puede llevar una pequeña explicación.',
      add: 'Muéstranos en una foto lo que quieres proteger',
      captionPlaceholder: '¿Qué hay en esta foto? ¿Por qué importa?',
      submit: 'Guardar mis fotos',
      skip: 'Saltar fotos y continuar',
    },
    stanceQ: {
      heading: 'Una pregunta sobre el proyecto',
      intro: 'Opcional — nos ayuda a ver si la conversación cambia alguna perspectiva.',
    },
  },
};
