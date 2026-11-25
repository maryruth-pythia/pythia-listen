/**
 * Tagalog UI copy.
 *
 * Pythia responds in Tagalog when language='tl'. This file is the UI chrome.
 * Modern conversational Tagalog with respectful "po"/"opo" markers where
 * appropriate to the community-engagement context.
 */

import { CopyEN } from './en';

export const tl: CopyEN = {
  common: {
    back: 'Bumalik',
    next: 'Susunod',
    cancel: 'Kanselahin',
    confirm: 'Kumpirmahin',
    done: 'Tapos na',
    edit: 'I-edit',
    optional: 'opsyonal',
    skip: 'Laktawan',
    continue: 'Magpatuloy',
  },
  beginConsent: {
    yes: 'Oo, simulan na natin',
    questions: 'May tanong muna ako',
    no: 'Hindi, mas mabuting hindi na lang',
    declinedHeading: 'Salamat sa inyong panahon.',
    declinedBody:
      'Wala kaming itatabi tungkol sa pagdalaw na ito. Kung magbabago ang inyong isip, maaari kayong bumalik anumang oras.',
  },
  demographics: {
    heading: 'Ilang mabilis na bagay bago tayo magsimula',
    intro:
      'Lahat ng ito ay opsyonal. Maaaring laktawan kung mas gusto ninyong hindi ibahagi. Ginagamit namin ito para tiyakin na ang iba\'t ibang boses ay nababanggit sa anumang ulat — hindi para makilala kayo.',
    languageLabel: 'Wika para sa pag-uusap na ito',
    relationshipLabel: 'Paano kayo konektado sa lugar',
    genderLabel: 'Kasarian',
    indigenousLabel: 'Kinikilala ba ninyo ang inyong sarili bilang Indigenous?',
    indigenousFollowupLabel:
      'Aling tao, bansa, o komunidad? (opsyonal)',
    indigenousFollowupHint:
      'hal., Native Hawaiian, Sami, Adivasi, Quechua, Yoruba, Maori, Lumad, San — kung paano ninyo tinatawag ang inyong sarili.',
    ageLabel: 'Hanay ng edad',
    submit: 'Magpatuloy sa pag-uusap',
    skipAll: 'Laktawan at magpatuloy',
    selfDescribePlaceholder: 'Paano ninyo ito ilalarawan?',
    options: {
      language: {
        en: 'English',
        es: 'Español',
        olelo: 'ʻŌlelo Hawaiʻi (paparating)',
        other: 'Ibang wika',
      },
      relationship: {
        lives_immediate: 'Nakatira ako sa kapitbahayan',
        lives_nearby: 'Nakatira ako sa malapit',
        works_or_business: 'Nagtatrabaho o may negosyo dito',
        family_or_land: 'Konektado sa pamamagitan ng pamilya o lupain',
        visiting: 'Bumibisita lang',
        other: 'Iba pa',
        prefer_not_to_say: 'Mas gusto kong hindi sabihin',
      },
      gender: {
        woman: 'Babae',
        man: 'Lalaki',
        nonbinary: 'Non-binary',
        two_spirit: 'Two-Spirit',
        genderqueer: 'Genderqueer',
        trans_woman: 'Trans woman',
        trans_man: 'Trans man',
        self_describe: 'Gusto kong ilarawan mismo',
        prefer_not_to_say: 'Mas gusto kong hindi sabihin',
      },
      indigenous: {
        yes: 'Kinikilala ko ang aking sarili bilang Indigenous',
        no: 'Hindi ako kinikilala bilang Indigenous',
        prefer_not_to_say: 'Mas gusto kong hindi sabihin',
      },
      age: {
        '18_24': '18–24',
        '25_34': '25–34',
        '35_49': '35–49',
        '50_64': '50–64',
        '65_plus': '65+',
        prefer_not_to_say: 'Mas gusto kong hindi sabihin',
      },
    },
  },
  language: {
    pickHeading: 'Pumili ng wika para magsimula',
    pickSub:
      'Makikipag-usap si Pythia sa wika na inyong pipiliin. Maaari ninyong baguhin anumang oras sa pamamagitan ng muling pagsisimula.',
    en: 'English',
    es: 'Español',
  },
  start: {
    back: '← Bumalik',
    tag: 'Komunidad',
    h: 'Bago tayo magsimula',
    languageLabel: 'Wika para sa pag-uusap',
    modeLabel: 'Paano ninyo gustong lumahok?',
    modeType: 'I-type ang aking mga sagot',
    modeVoice: 'Magsalita ng aking mga sagot (si Pythia ay magsasalita at makikinig)',
    intro:
      'Magkakaroon kayo ng pribadong pag-uusap kasama si Pythia. Si Pythia ay isang AI assistant na nakikinig sa mga tao sa komunidad tungkol sa mga iminumungkahing proyekto sa malinis na enerhiya. Ang pag-uusap ay boluntaryo — maaari kayong huminto, laktawan ang anumang tanong, o tumanggi sumagot anumang oras. Walang anumang sasabihin ninyo ang ibabahagi sa kahit kanino maliban kung kayo mismo ang magbibigay ng pahintulot sa huli.',
    begin: 'Simulan ang pag-uusap',
  },
  chat: {
    placeholder: 'I-type ang inyong mensahe…',
    placeholderFirstTurn: 'Ibahagi kung ano ang nasa isip ninyo, o magtanong muna…',
    send: 'Ipadala',
    wrapUp: 'Gusto kong tapusin',
    pythiaIsTyping: 'Nakikinig si Pythia…',
    error: 'May nangyaring mali. Subukang muli o i-refresh ang pahina.',
    firstTurnHint:
      'Kapag handa na kayo — ibahagi kung ano ang nasa isip ninyo, o magtanong muna kay Pythia. Walang script. Maaari rin kayong mag-click ng "Gusto kong tapusin" anumang oras.',
  },
  recap: {
    heading: 'Ito ang aking narinig',
    intro:
      'Maglaan ng sandali upang basahin ito. Sabihin sa akin kung may nagkamali ako, o kung may dapat idagdag.',
    correct: 'Oo, tama iyan',
    edit: 'Gusto kong magtama o magdagdag',
  },
  consent: {
    heading: '¿Ano ang maaari naming ibahagi, at kanino?',
    intro:
      'Kayo ang magpapasya kung ano — kung mayroon man — ang mailalabas mula sa pag-uusap na ito. Pumili ng nararamdaman ninyong tama. Maaari rin kayong walang ibahagi, at itatabi lamang ni Pythia ang inyong sinabi para sa inyong sariling tala.',
    shareDeveloper: 'Ibahagi sa kompanyang nagmumungkahi ng proyekto',
    shareDeveloperHelp:
      'Sa isang pribadong ulat. Tumutulong sa kompanya na maintindihan ang pananaw ng komunidad.',
    shareFunder: 'Ibahagi sa mga nagpopondo o namumuhunan sa proyekto',
    shareFunderHelp:
      'Sa isang hiwalay na ulat. Parehong nilalaman, ibang madla.',
    sharePublic: 'Isama sa pampublikong ulat ng Pythia',
    sharePublicHelp:
      'Ginagamit upang ibatay ang mas malawak na patakaran at gawi. Walang detalyeng makakakilala sa inyo.',
    identification:
      'Kung may ibahagi, paano kayo dapat tukuyin?',
    identificationHelp:
      'Maaari kayong manatiling lubos na hindi kilala, o ilarawan ang inyong sarili sa anumang paraan — isang pseudonym, isang papel tulad ng "isang nangungupahan malapit sa lugar," o anuman ang nararamdaman ninyong tama. Kayo ang magpapasya.',
    idAnonymous: 'Hindi kilala',
    idAnonymousHelp: 'Tatawaging "isang miyembro ng komunidad" lamang — walang ibang detalye.',
    idSelfDescribed: 'Tukuyin ako — ako ang maglalarawan kung paano',
    idSelfDescribedHelp:
      'Kayo ang pipili ng deskripsyon. Pseudonym, papel, o anuman ang gusto ninyo.',
    idDescriptionPlaceholder:
      'hal., "Maya," "isang magsasaka malapit sa lugar," "isang nakatatandang Indigenous"',
    notes:
      'Anumang iba pang nais ninyong malaman namin tungkol sa kung paano pangangasiwaan ang inyong ibinahagi',
    submit: 'I-save ang aking mga pahintulot',
  },
  advocacy: {
    heading: 'Para sa inyo — ang inyong sinabi at kung paano ito makakatulong',
    intro:
      'Isang maikling buod na maaari ninyong itago, ibahagi, o gamitin para ipagtanggol ang inyong sarili. Inyo ito. Wala nang kailangan si Pythia mula sa inyo.',
    done: 'Tapos na ako',
  },
  panels: {
    map: {
      heading: 'Markahan ang mapa ng inyong mga alalahanin',
      intro:
        'Pindutin ang anumang lugar para maglagay ng pin. Para sa bawat pin, maaari kayong magdagdag ng label at tala. Tumutulong ito sa amin na maintindihan kung saan ang inyong mga partikular na alalahanin, hindi lang kung ano sila.',
      submit: 'I-save ang aking mga pin',
      skip: 'Laktawan ang mapa at magpatuloy',
      labelPlaceholder: 'Maikling label (hal., "ingay", "kultural na lugar")',
      notePlaceholder: 'Bakit mahalaga ang lugar na ito?',
    },
    photo: {
      heading: 'Kung gusto ninyo, magbahagi ng isa o higit pang larawan',
      intro:
        'Minsan ang larawan ay naipapahayag kung ano ang hindi kayang sabihin ng mga salita. Ibahagi kung ano ang mahalaga para sa inyo sa lugar na ito — opsyonal. Ang bawat larawan ay maaaring may maikling paliwanag.',
      add: 'Ipakita sa amin sa larawan ang gusto ninyong protektahan',
      captionPlaceholder: 'Ano ang nasa larawang ito? Bakit mahalaga?',
      submit: 'I-save ang aking mga larawan',
      skip: 'Laktawan ang mga larawan at magpatuloy',
    },
    stanceQ: {
      heading: 'Isang tanong tungkol sa proyekto',
      intro: 'Opsyonal — nakatutulong ito sa amin na makita kung nagbabago ang pananaw pagkatapos ng usapan.',
    },
  },
};
