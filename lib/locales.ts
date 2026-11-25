/**
 * Locale registry — the single place that defines the languages Pythia's
 * accessible flows support. Designed for ANY language (add an entry) while
 * shipping the three wired today: English, Spanish, Tagalog.
 *
 * `bcp47` drives the browser Web Speech voice (text-to-speech + speech-to-
 * text). `controls` are the short UI / quick-reply labels; any missing key
 * falls back to English so a half-translated locale still works.
 *
 * NOTE: the Spanish and Tagalog control strings below are first-draft and
 * should be reviewed by a native speaker (and aligned with lib/i18n/*) before
 * relying on them in the field.
 */

export type LocaleCode = string; // 'en' | 'es' | 'tl' | future codes

export interface ControlCopy {
  listen: string;
  voiceOn: string;
  voiceOff: string;
  speaking: string;
  preparing: string;
  listening: string;
  mic: string;
  yes: string;
  no: string;
  more: string;
  repeat: string;
  ownWords: string;
  send: string;
  inputPlaceholder: string;
  language: string;
  /** Survey-builder starter screen (translated per locale). */
  chatIntro: string;
  chatStarters: string[];
  selfSignNote: string;
  /** Survey form (what a respondent sees). */
  stanceLow: string;
  stanceHigh: string;
  feelBefore: string;
  feelAfter: string;
  answerPlaceholder: string;
  submit: string;
  thanks: string;
}

export interface Locale {
  code: LocaleCode;
  /** BCP-47 tag for Web Speech (TTS/STT). */
  bcp47: string;
  /** Endonym shown in the language picker. */
  label: string;
  enabled: boolean;
  controls: ControlCopy;
}

const EN: ControlCopy = {
  listen: 'Listen',
  stanceLow: 'Strongly opposed',
  stanceHigh: 'Strongly supportive',
  feelBefore: 'Before we start — how do you feel about this project right now?',
  feelAfter: 'Now that you’ve shared your thoughts — how do you feel about the project?',
  answerPlaceholder: 'Your answer, in your own words…',
  submit: 'Submit',
  thanks: 'Thank you — your response has been recorded.',
  chatIntro:
    'Tell me about the project and who you want to hear from. I’ll ask a couple of quick questions, propose a short survey, and build it live once you say go. Try:',
  chatStarters: [
    'Help me build a listening survey for the Prince William Digital Gateway data-center fight.',
    'I want to hear quiet concerns about a 120 MW solar farm without leading people.',
    'Build a short survey to find common ground between neighbors and a developer.',
    'We need to reach farmers who haven’t spoken up yet — what should we ask?',
  ],
  selfSignNote:
    'Self-signification: participants tag their own story — the survey never scores for them. You review before anything goes to the community.',
  voiceOn: 'Read aloud',
  voiceOff: 'Stop reading',
  speaking: 'Speaking…',
  preparing: 'Getting the voice ready… (the first time takes a few seconds)',
  listening: 'Listening…',
  mic: 'Tap to talk',
  yes: 'Yes',
  no: 'No',
  more: 'Tell me more',
  repeat: 'Say that again',
  ownWords: 'In my own words',
  send: 'Send',
  inputPlaceholder: 'Type, or tap the mic to talk…',
  language: 'Language',
};

// DRAFT — review with a native speaker before field use.
const ES: ControlCopy = {
  listen: 'Escuchar',
  stanceLow: 'Muy en contra',
  stanceHigh: 'Muy a favor',
  feelBefore: 'Antes de empezar — ¿cómo te sientes sobre este proyecto ahora mismo?',
  feelAfter: 'Ahora que has compartido tus ideas — ¿cómo te sientes sobre el proyecto?',
  answerPlaceholder: 'Tu respuesta, en tus propias palabras…',
  submit: 'Enviar',
  thanks: 'Gracias — tu respuesta ha sido registrada.',
  chatIntro:
    'Cuéntame sobre el proyecto y a quién quieres escuchar. Te haré un par de preguntas rápidas, propondré una encuesta breve y la publicaré en vivo cuando digas que sí. Prueba:',
  chatStarters: [
    'Ayúdame a crear una encuesta de escucha para el conflicto del centro de datos Prince William Digital Gateway.',
    'Quiero escuchar las inquietudes silenciosas sobre una planta solar de 120 MW sin influir en las personas.',
    'Crea una encuesta breve para encontrar puntos en común entre las personas vecinas y la empresa desarrolladora.',
    'Necesitamos llegar a quienes se dedican a la agricultura y aún no han hablado — ¿qué deberíamos preguntar?',
  ],
  selfSignNote:
    'Autosignificación: las personas participantes etiquetan su propia historia — la encuesta nunca puntúa por ellas. Tú revisas antes de que algo llegue a la comunidad.',
  voiceOn: 'Leer en voz alta',
  voiceOff: 'Detener lectura',
  speaking: 'Hablando…',
  preparing: 'Preparando la voz… (la primera vez tarda unos segundos)',
  listening: 'Escuchando…',
  mic: 'Toca para hablar',
  yes: 'Sí',
  no: 'No',
  more: 'Cuéntame más',
  repeat: 'Repítelo',
  ownWords: 'En mis propias palabras',
  send: 'Enviar',
  inputPlaceholder: 'Escribe, o toca el micrófono para hablar…',
  language: 'Idioma',
};

// DRAFT — review with a native speaker before field use.
const TL: ControlCopy = {
  listen: 'Makinig',
  stanceLow: 'Tutol na tutol',
  stanceHigh: 'Sang-ayon na sang-ayon',
  feelBefore: 'Bago magsimula — ano ang nararamdaman mo tungkol sa proyektong ito ngayon?',
  feelAfter: 'Ngayong naibahagi mo na ang iyong saloobin — ano ang nararamdaman mo tungkol sa proyekto?',
  answerPlaceholder: 'Ang iyong sagot, sa sarili mong mga salita…',
  submit: 'Ipasa',
  thanks: 'Salamat — naitala na ang iyong sagot.',
  chatIntro:
    'Sabihin mo sa akin ang tungkol sa proyekto at kung sino ang gusto mong marinig. Magtatanong ako ng ilang mabilis na tanong, magmumungkahi ng maikling survey, at gagawin itong live kapag sinabi mong sige. Subukan:',
  chatStarters: [
    'Tulungan mo akong gumawa ng listening survey para sa laban sa data center ng Prince William Digital Gateway.',
    'Gusto kong marinig ang mga tahimik na alalahanin tungkol sa 120 MW na solar farm nang hindi inihahatak ang mga tao.',
    'Gumawa ng maikling survey para maghanap ng common ground sa pagitan ng mga kapitbahay at ng developer.',
    'Kailangan naming maabot ang mga magsasaka na hindi pa nagsasalita — ano ang dapat naming itanong?',
  ],
  selfSignNote:
    'Self-signification: ang mga kalahok mismo ang nagtatatak ng sarili nilang kuwento — hindi sila iniiskor ng survey. Ikaw ang magrerepaso bago may mapunta sa komunidad.',
  voiceOn: 'Basahin nang malakas',
  voiceOff: 'Itigil ang pagbasa',
  speaking: 'Nagsasalita…',
  preparing: 'Inihahanda ang boses… (ilang segundo sa unang beses)',
  listening: 'Nakikinig…',
  mic: 'Pindutin para magsalita',
  yes: 'Oo',
  no: 'Hindi',
  more: 'Sabihin mo pa',
  repeat: 'Ulitin mo',
  ownWords: 'Sa sarili kong salita',
  send: 'Ipadala',
  inputPlaceholder: 'Mag-type, o pindutin ang mikropono…',
  language: 'Wika',
};

// DRAFT — review with a native speaker before field use.
const PT: ControlCopy = {
  listen: 'Ouvir',
  stanceLow: 'Totalmente contra',
  stanceHigh: 'Totalmente a favor',
  feelBefore: 'Antes de começar — como você se sente sobre este projeto agora?',
  feelAfter: 'Agora que você compartilhou suas ideias — como você se sente sobre o projeto?',
  answerPlaceholder: 'Sua resposta, com suas próprias palavras…',
  submit: 'Enviar',
  thanks: 'Obrigado — sua resposta foi registrada.',
  chatIntro:
    'Conte-me sobre o projeto e quem você quer ouvir. Vou fazer algumas perguntas rápidas, propor uma pesquisa curta e publicá-la ao vivo quando você disser que sim. Experimente:',
  chatStarters: [
    'Ajude-me a criar uma pesquisa de escuta para o conflito do data center Prince William Digital Gateway.',
    'Quero ouvir preocupações silenciosas sobre uma usina solar de 120 MW sem induzir as pessoas.',
    'Crie uma pesquisa curta para encontrar pontos em comum entre vizinhos e a empresa desenvolvedora.',
    'Precisamos alcançar agricultores que ainda não se manifestaram — o que devemos perguntar?',
  ],
  selfSignNote:
    'Autossignificação: as pessoas participantes marcam a própria história — a pesquisa nunca pontua por elas. Você revisa antes de qualquer coisa chegar à comunidade.',
  voiceOn: 'Ler em voz alta',
  voiceOff: 'Parar leitura',
  speaking: 'Falando…',
  preparing: 'Preparando a voz… (a primeira vez leva alguns segundos)',
  listening: 'Ouvindo…',
  mic: 'Toque para falar',
  yes: 'Sim',
  no: 'Não',
  more: 'Conte-me mais',
  repeat: 'Repita',
  ownWords: 'Nas minhas palavras',
  send: 'Enviar',
  inputPlaceholder: 'Digite, ou toque no microfone para falar…',
  language: 'Idioma',
};

const HI: ControlCopy = {
  listen: 'सुनें',
  stanceLow: 'पूरी तरह विरोध में',
  stanceHigh: 'पूरी तरह समर्थन में',
  feelBefore: 'शुरू करने से पहले — इस परियोजना के बारे में अभी आप कैसा महसूस करते हैं?',
  feelAfter: 'अब जब आपने अपने विचार साझा कर लिए हैं — इस परियोजना के बारे में आप कैसा महसूस करते हैं?',
  answerPlaceholder: 'अपने शब्दों में अपना उत्तर…',
  submit: 'जमा करें',
  thanks: 'धन्यवाद — आपका उत्तर दर्ज कर लिया गया है।',
  chatIntro:
    'मुझे परियोजना के बारे में बताइए, और यह भी कि आप किनकी बात सुनना चाहते हैं। कुछ छोटे सवाल पूछे जाएँगे, एक छोटा सर्वेक्षण सुझाया जाएगा, और आपके कहते ही उसे तुरंत बना दिया जाएगा। आज़माइए:',
  chatStarters: [
    'प्रिंस विलियम डिजिटल गेटवे डेटा-सेंटर विवाद के लिए एक सुनने वाला सर्वेक्षण बनाने में मदद करें।',
    '120 मेगावाट के सौर फ़ार्म को लेकर लोगों की दबी हुई चिंताएँ जानना चाहते हैं — बिना किसी को किसी दिशा में झुकाए।',
    'पड़ोसियों और डेवलपर के बीच साझा ज़मीन खोजने के लिए एक छोटा सर्वेक्षण बनाएँ।',
    'हमें उन किसानों तक पहुँचना है जिन्होंने अब तक कुछ नहीं कहा — हमें क्या पूछना चाहिए?',
  ],
  selfSignNote:
    'स्व-अर्थांकन: प्रतिभागी अपनी कहानी स्वयं चिह्नित करते हैं — सर्वेक्षण उनकी ओर से कोई आकलन नहीं करता। समुदाय तक कुछ भी पहुँचने से पहले आप उसकी समीक्षा करते हैं।',
  voiceOn: 'ज़ोर से पढ़ें',
  voiceOff: 'पढ़ना रोकें',
  speaking: 'बोल रहे हैं…',
  preparing: 'आवाज़ तैयार हो रही है… (पहली बार कुछ सेकंड लगते हैं)',
  listening: 'सुन रहे हैं…',
  mic: 'बोलने के लिए दबाएँ',
  yes: 'हाँ',
  no: 'नहीं',
  more: 'और बताइए',
  repeat: 'फिर से कहिए',
  ownWords: 'अपने शब्दों में',
  send: 'भेजें',
  inputPlaceholder: 'लिखें, या बोलने के लिए माइक दबाएँ…',
  language: 'भाषा',
};

export const LOCALES: Locale[] = [
  { code: 'en', bcp47: 'en-US', label: 'English', enabled: true, controls: EN },
  { code: 'es', bcp47: 'es-US', label: 'Español', enabled: true, controls: ES },
  { code: 'tl', bcp47: 'fil-PH', label: 'Tagalog', enabled: true, controls: TL },
  { code: 'pt', bcp47: 'pt-BR', label: 'Português', enabled: true, controls: PT },
  { code: 'hi', bcp47: 'hi-IN', label: 'हिन्दी', enabled: true, controls: HI },
];

export const DEFAULT_LOCALE: Locale = LOCALES[0];

export function getLocale(code?: string): Locale {
  return LOCALES.find((l) => l.code === code && l.enabled) ?? DEFAULT_LOCALE;
}

export function enabledLocales(): Locale[] {
  return LOCALES.filter((l) => l.enabled);
}
