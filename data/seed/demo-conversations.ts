/**
 * Eight demo conversations for the Honua Solar & Storage project.
 *
 * Each conversation is fully formed: opening turn from Pythia, multi-turn
 * dialogue, recap, and a consent record. They exist so the operator can
 * demo synthesis and Tier 1 reports without role-playing 8 conversations
 * first.
 *
 * Mix: 6 EN, 2 ES. Stances range from refused-to-engage through
 * conditionally supportive. Identification preferences and consent flags
 * are deliberately varied so the operator's consent ledger looks lived-in.
 *
 * IDs are all prefixed `DEMO-` so operators can tell them apart from real
 * conversations.
 */

import type {
  Language,
  IdentificationPreference,
  SessionStatus,
  ParticipationConsentState,
  Demographics,
} from '../../lib/types';
import type { SignifierResponse } from '../../lib/signifiers';

export interface DemoConversation {
  /** Sequential demo id (we'll prefix with DEMO- when inserting) */
  slug: string;
  language: Language;
  status: SessionStatus;
  identification?: IdentificationPreference;
  /** A brief operator-only label so it's easy to remember which is which */
  personaSummary: string;
  /** ISO date for createdAt; updatedAt is computed at insert time */
  createdAt: string;
  /** Beginning-of-conversation consent state */
  participationConsentState?: ParticipationConsentState;
  /** Optional demographic record (matches the form fields) */
  demographics?: Demographics;
  consent?: {
    mayShareWithDeveloper: boolean;
    mayShareWithFunder: boolean;
    mayShareInPublicReport: boolean;
    notes?: string;
  };
  /** Conversation turns. Stages are inferred at insert time. */
  turns: Array<{ role: 'assistant' | 'user'; content: string; stage?: string }>;
  /** Optional Pythia-side recap text (assistant turn at stage='recap') */
  recap?: string;
  /** Optional advocacy summary (assistant turn at stage='advocacy') */
  advocacy?: string;
  /** Signifier self-scores captured after the conversation (dummy data for demo). */
  signifierResponses?: SignifierResponse[];
}

const HONUA_OPENING = `Hi. My name is Pythia — I'm an AI assistant working with an organization that listens to communities about energy projects. I want to be clear up front: I'm not a person, and I'm not connected to any developer or utility.

There's a utility-scale solar and battery storage project being proposed on the leeward side of Hawai'i Island — about 40 megawatts of solar with battery storage, on agricultural-zoned land. It's still early — no permits yet, but the site is being negotiated and community input is starting to matter. The organization I work with is independent. We're not paid by the developer, and we don't represent Hawaiian Electric or any government agency. We're here to listen.

This conversation is completely voluntary. You can stop anytime, skip anything, or just ask me questions instead. What you share stays private unless you explicitly tell me it's okay to pass along — and even then, you choose how you're identified and who sees it. I'm not promising your input will change the project, only that it'll be considered and, if you want, shared back to you in summary form.

I'd love to hear what you think, if you're open to talking. And if there's anything you want to ask me first, go ahead.`;

const HONUA_OPENING_ES = `Hola. Mi nombre es Pythia — soy un asistente de inteligencia artificial que trabaja con una organización que escucha a las comunidades sobre proyectos de energía. Quiero ser clara desde el principio: no soy una persona, y no estoy conectada a ningún desarrollador ni a la compañía eléctrica.

Se está proponiendo un proyecto de energía solar a escala industrial con almacenamiento en baterías en el lado de sotavento de la Isla de Hawai'i — unos 40 megavatios de paneles solares con almacenamiento, sobre terrenos clasificados como agrícolas. Aún es temprano — no hay permisos todavía, pero se está negociando el sitio y la opinión de la comunidad empieza a importar. La organización con la que trabajo es independiente. No nos paga el desarrollador, y no representamos a Hawaiian Electric ni a ninguna agencia del gobierno. Estamos aquí para escuchar.

Esta conversación es completamente voluntaria. Puede detenerse en cualquier momento, omitir cualquier cosa, o solo hacerme preguntas. Lo que comparte queda privado a menos que usted explícitamente me diga que está bien transmitirlo — y aún entonces, usted elige cómo se le identifica y quién lo ve. No le estoy prometiendo que su aporte cambiará el proyecto, solamente que será considerado y, si lo desea, le compartiremos un resumen.

Me encantaría escuchar lo que piensa, si está dispuesto a conversar. Y si hay algo que quiera preguntarme primero, adelante.`;

export const demoConversations: DemoConversation[] = [
  // ---- 1. KALEI — Native Hawaiian elder, cultural concerns ----
  {
    slug: 'kalei-elder',
    language: 'en',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Native Hawaiian elder, 67, ag land + cultural concerns; partial consent',
    createdAt: '2026-05-02T10:14:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'en',
      relationshipToArea: 'family_or_land',
      gender: 'woman',
      indigenous: 'yes',
      indigenousSelfDescribe: 'Kanaka Maoli (Native Hawaiian)',
      ageRange: '65_plus',
      preStance: 30,
      capturedAt: '2026-05-02T10:14:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: false,
      mayShareInPublicReport: false,
      notes: 'Use first name only. Do not share with funders. Do not include in any public-facing report. The developer can hear this.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Aloha. I'll talk. I'm Kalei, my family has been on this land since before statehood. Yes I know the area you're talking about. Some of those parcels touch the ahupua'a my grandmother walked. So I have things to say." },
      { role: 'assistant', content: "Aloha, Kalei. Thank you. That land carries a lot — your family's history, the ahupua'a system, what your grandmother knew and walked. Can I ask: when you think about that specific area now, with this project being proposed, what's the first thing that comes up for you?" },
      { role: 'user', content: "What comes up is — they always say agricultural land. But ag land here isn't empty. There's old taro complexes, there's burial sites in some places, there's water that comes down through the lava tubes. They never ask before they pick. By the time the meeting happens, the maps are made." },
      { role: 'assistant', content: "That sequence — the maps being made before the asking — has come up in other conversations too. May I ask what would have been different, if anyone had come to your family before the maps?" },
      { role: 'user', content: "We could have shown them where the wahi pana are. Where the wai is. Which lo'i still has water memory. We would have said — not these acres, but maybe these other acres. And maybe a smaller project. We don't say no to clean energy. We say no to this kind of asking." },
      { role: 'assistant', content: "That's clear. There's a difference between being against the project and being against how the asking happens. Has anyone in your community been able to show developers, on their land, the kinds of things you'd want to show — wahi pana, water sites — in a way that actually changed the plan?" },
      { role: 'user', content: "Once. About fifteen years ago, with a county road project. They moved the road two hundred feet because of an iwi kupuna site we showed them. That was because we had a kupuna in the room who had standing, and a county engineer who listened. Both. You need both." },
      { role: 'assistant', content: "Both pieces — kupuna with standing, and a counterpart who actually listens. I want to make sure I'm hearing this right before we wrap up. Is there anything else you'd want said about this project, or about how community engagement should happen here, that I haven't asked you about?" },
      { role: 'user', content: "Yes. Tell them — Hawaiian language matters too. If their meeting handouts are only English, they're saying who counts. Even one page in 'Olelo Hawai'i changes the room." },
    ],
    recap: `Here's what I heard from you, Kalei.

You said your family has been on this land since before statehood, and the ahupua'a your grandmother walked includes parcels in the proposed project area. You said agricultural land here isn't empty — there are taro complexes, burial sites, and water that runs through lava tubes. Your concern wasn't whether clean energy is good or bad. It was that developers pick the maps before they ask, and by the time the community meeting happens, the decisions that matter are already locked.

You said it could have been different if someone had come to your family before the maps were drawn — you could have shown them wahi pana, where the wai is, which lo'i still has water memory. You said the right answer might have been "not these acres, but maybe these other acres."

You shared an example from a county road project fifteen years ago where a road was moved two hundred feet because a kupuna with standing was in the room and a county engineer actually listened. You said both pieces are needed.

You closed by saying that even one page of materials in 'Olelo Hawai'i changes the room — because language tells people who counts.

Did I get all of that right, or is there anything off?`,
    advocacy: `**What you said matters because…**
Your knowledge — the ahupua'a, the wahi pana, the water memory — is exactly what Hawai'i's environmental impact processes are supposed to surface but rarely do. You named the structural problem (maps drawn before the asking) and the structural fix (kupuna with standing + counterpart who actually listens). Both pieces matter to anyone designing this project, and both are routinely dropped.

**What to ask for**
- Ask for a site visit with kupuna BEFORE the project's footprint is finalised, not after.
- Ask for materials — even one page — in 'Olelo Hawai'i, and for at least one community meeting where the lead language is Hawaiian.
- Ask the developer to commit, in writing, to the alternative-acreage approach: that they'll shift the footprint based on what's shown to them.
- Ask the Public Utilities Commission proceeding to record cultural-site testimony separately from general public comment, so it can't be averaged out.
- Ask for a named kupuna liaison on the developer's stakeholder team, not just a community-relations consultant.

**What others have asked for**
Other Native communities working with similar projects have asked for binding language in the Power Purchase Agreement that reroutes a project if cultural sites are found, rather than treating the discovery as a delay. It's been done.

**One thing to remember**
Your mana'o has standing under HRS Chapter 6E and the Native Hawaiian Public Trust. Not a courtesy — a right.`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 22, capturedVia: 'screen', capturedAt: '2026-05-02T10:52:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 15, capturedVia: 'screen', capturedAt: '2026-05-02T10:52:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 42, capturedVia: 'screen', capturedAt: '2026-05-02T10:53:00Z' },
      { signifierId: 'community_impact',   dyadValue: 28, capturedVia: 'screen', capturedAt: '2026-05-02T10:53:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.10, b: 0.05, c: 0.85 }, capturedVia: 'screen', capturedAt: '2026-05-02T10:54:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.80, b: 0.05, c: 0.15 }, capturedVia: 'screen', capturedAt: '2026-05-02T10:54:30Z' },
    ],
  },

  // ---- 2. MIKE — adjacent cattle farmer, opposed ----
  {
    slug: 'mike-rancher',
    language: 'en',
    status: 'consented',
    identification: 'anonymous',
    personaSummary: 'Adjacent cattle farmer, 58, water/dust/distrust; refuses developer share',
    createdAt: '2026-05-02T15:42:00Z',
    participationConsentState: 'questions_first',
    demographics: {
      language: 'en',
      relationshipToArea: 'works_or_business',
      gender: 'man',
      indigenous: 'no',
      ageRange: '50_64',
      preStance: 28,
      capturedAt: '2026-05-02T15:42:00Z',
    },
    consent: {
      mayShareWithDeveloper: false,
      mayShareWithFunder: false,
      mayShareInPublicReport: true,
      notes: 'Keep me anonymous. I do NOT want what I said going to the developer. Use it in your report if you want. The developer hasn\'t earned hearing this directly from me.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Yeah I'll talk but you should know I'm not going to be diplomatic about it. I run cattle on the parcel right next to where they want this thing. I've been there 30 years. They sent me a single letter and the address was wrong." },
      { role: 'assistant', content: "Got it. No need to be diplomatic — I'd rather hear what you actually think. The wrong-address letter is its own story. Before we get to the project, can I ask what 30 years on that land has looked like? What does the place mean to you, and what's working there right now?" },
      { role: 'user', content: "It means everything. My kids grew up on it. The water is good. I know every fence line. The thing that worries me about this project is the water table. They drill, they grade two hundred acres, they put down concrete pads — I don't believe their hydrology study. Nobody around here believes those studies." },
      { role: 'assistant', content: "The water table fear, and the underlying skepticism about the studies — those are very specific. Have you seen the hydrology study, or are you reacting to a pattern of hydrology studies in this area generally?" },
      { role: 'user', content: "Pattern. We had a quarry put in fifteen years over the ridge that swore they wouldn't affect the water and they did. Two wells in the valley dropped. The study said it wouldn't happen. So when I see another big project coming with another study, you can guess what I think." },
      { role: 'assistant', content: "That's a useful piece of context — your skepticism isn't abstract, it's grounded in something specific that happened. Can I ask whether there's anything that would actually move the needle for you on a project like this? Not necessarily this one — but is there a version of how it could be done that you'd at least be neutral on?" },
      { role: 'user', content: "Sure. Independent hydrology — and I mean truly independent, not paid by them. Real bonds posted upfront so if my well goes dry they have to make me whole, and the bond doesn't depend on a court fight. And the construction has to be seasonal — they can't grade in the dry months when the dust will blow into my pastures. Those three things and I'd shut up." },
      { role: 'assistant', content: "Independent hydrology, real bonds posted upfront with a no-court-fight payout, and seasonal construction. Got it. Last thing — is there anything else you want me to make sure I include? Anything I didn't ask?" },
      { role: 'user', content: "Yeah. Tell them I don't trust them. Tell them the letter with the wrong address told me everything I needed to know about how careful they are. They want a relationship with my community, they have a lot of work to do." },
    ],
    recap: `Here's what I heard.

You've run cattle on the parcel adjacent to the proposed site for 30 years. Your kids grew up there. You learned about the project from a single letter — sent to the wrong address — which already told you something about how the developer treats the relationship.

Your concrete worry is the water table. You don't believe their hydrology study, and your skepticism isn't abstract — fifteen years ago a quarry over the ridge promised the same thing and two wells in the valley dropped. So you're reacting to a pattern, not a vibe.

You said three things would actually move you toward neutral on a project like this:
- Truly independent hydrology — not commissioned by the developer
- Real bonds posted upfront, with a payout that doesn't depend on a court fight if your well goes dry
- Seasonal construction, so grading happens outside the dry months when dust blows into your pastures

You closed by saying you don't trust them, and that they have a lot of work to do if they want a relationship with your community.

Anything I missed or got sideways?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 18, capturedVia: 'screen', capturedAt: '2026-05-03T09:22:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 8,  capturedVia: 'screen', capturedAt: '2026-05-03T09:22:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 22, capturedVia: 'screen', capturedAt: '2026-05-03T09:23:00Z' },
      { signifierId: 'community_impact',   dyadValue: 30, capturedVia: 'screen', capturedAt: '2026-05-03T09:23:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.15, b: 0.05, c: 0.80 }, capturedVia: 'screen', capturedAt: '2026-05-03T09:24:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.75, b: 0.05, c: 0.20 }, capturedVia: 'screen', capturedAt: '2026-05-03T09:24:30Z' },
    ],
  },

  // ---- 3. JANELLE — renter, supportive ----
  {
    slug: 'janelle-renter',
    language: 'en',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Renter, 32, asthma + bills; consents to share everywhere',
    createdAt: '2026-05-03T08:55:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'en',
      relationshipToArea: 'lives_nearby',
      gender: 'woman',
      indigenous: 'no',
      ageRange: '25_34',
      preStance: 50,
      capturedAt: '2026-05-03T08:55:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: true,
      mayShareInPublicReport: true,
      notes: 'Janelle is fine. Share with everyone — I want this on record.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Hi. I'm Janelle. I rent in town, about four miles from where they're proposing this. I'll be honest — I'm in favor. My power bill is killing me and my son has asthma. So go ahead, ask me whatever." },
      { role: 'assistant', content: "Hi Janelle. Thank you for being upfront. The two things you led with — bills and your son's asthma — those are real and specific. Can I ask: when you say the bill is killing you, what's the rough range, and what does an average summer look like at your place?" },
      { role: 'user', content: "We're paying $380-$420 a month for a two-bedroom. Summer it goes higher because the kid needs the AC running for the asthma. I work retail, my partner works construction. We're not rich. The HECO bill is the second-biggest line in our budget after rent." },
      { role: 'assistant', content: "That's a lot of context. I appreciate you sharing the actual number. So when you hear about a 40-megawatt solar project being proposed nearby, what do you hope it means for your bill — and what would worry you, if anything?" },
      { role: 'user', content: "Honestly I hope it means the bills come down. I'm not stupid — I know that's not how the utility works exactly, the way they price it. But I hope. And what worries me — I don't know, I guess if it goes in and the same big company that already gouges us also runs this and the savings don't reach us. That would be the worst version. Do all the work, all the disruption, and the bills stay the same." },
      { role: 'assistant', content: "That worry — disruption without savings reaching you — has come up from others too. Is there anything specific you'd want the developer or the utility to commit to, that would make you feel the savings will actually land in households like yours?" },
      { role: 'user', content: "Yeah. I'd want a tariff guarantee or something — a clear thing that says people in my zip code see X dollars off their bill, written down. Not 'we'll pass on savings.' Specific. And I'd want the construction jobs to actually go to local people. Not flown in." },
      { role: 'assistant', content: "Tariff guarantee with a specific dollar number for households in your area, and a real local-hire commitment. Got it. Last thing — anything else you want included?" },
      { role: 'user', content: "Just say there are people like me who want this. The loud people are usually against. There are quiet people who really need this to work and are hoping someone gets it right." },
    ],
    recap: `Here's what I heard from you, Janelle.

You rent in town, four miles from the proposed site. Your bill runs $380–$420 a month, higher in summer because your son's asthma needs the AC running. You work retail, your partner works construction. The utility bill is the second-biggest line in your budget after rent.

You're in favor of the project, but with a specific worry: you've watched big companies do the work, take the disruption, and not pass savings to households like yours. The "worst version" for you would be the project gets built and your bill doesn't change.

You said two things would make you trust this would actually help you:
- A tariff guarantee with a specific dollar number for households in your zip code, written down
- A real local-hire commitment for construction jobs, not flown-in workers

You closed by asking us to make sure the developer hears that there are people like you who need this to work — quiet people, not the loud ones.

Anything I got wrong or want to add?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 68, capturedVia: 'screen', capturedAt: '2026-05-04T14:10:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 52, capturedVia: 'screen', capturedAt: '2026-05-04T14:10:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 63, capturedVia: 'screen', capturedAt: '2026-05-04T14:11:00Z' },
      { signifierId: 'community_impact',   dyadValue: 72, capturedVia: 'screen', capturedAt: '2026-05-04T14:11:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.55, b: 0.30, c: 0.15 }, capturedVia: 'screen', capturedAt: '2026-05-04T14:12:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.50, b: 0.15, c: 0.35 }, capturedVia: 'screen', capturedAt: '2026-05-04T14:12:30Z' },
    ],
  },

  // ---- 4. ROBERTO — small business owner, ES, mixed ----
  {
    slug: 'roberto-landscaper',
    language: 'es',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Pequeño dueño de paisajismo, 47, dudas sobre prácticas laborales; comparte con desarrollador solamente',
    createdAt: '2026-05-03T17:08:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'es',
      relationshipToArea: 'works_or_business',
      gender: 'man',
      indigenous: 'no',
      ageRange: '35_49',
      preStance: 45,
      capturedAt: '2026-05-03T17:08:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: false,
      mayShareInPublicReport: false,
      notes: 'Solo el desarrollador. No quiero que esto vaya a inversionistas o a un informe público. Pueden usar mi primer nombre.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING_ES, stage: 'opening' },
      { role: 'user', content: "Hola. Soy Roberto. Tengo una pequeña empresa de paisajismo aquí, ocho empleados. Sé del proyecto, sí. Lo voy a hablar pero te digo desde ahora — tengo opiniones complicadas." },
      { role: 'assistant', content: "Hola Roberto. Gracias. Las opiniones complicadas son las más útiles, no las simples. ¿Por dónde quieres empezar — por la parte del proyecto que te parece bien, o por la parte que no?" },
      { role: 'user', content: "Por las dos. Lo que me parece bien es que aquí necesitamos trabajos. Construcción, mantenimiento, eso podría ser bueno para gente como mis empleados. Lo que no me parece bien es que estas empresas grandes vienen, contratan a la mitad del precio a gente que no conoce el lugar, y cuando el proyecto está listo se van. Quedan los paneles y se van." },
      { role: 'assistant', content: "Eso es claro — el problema no es el proyecto, es el patrón. Empleos sí, pero los empleos correctos. ¿Tienes algún ejemplo concreto de una empresa que sí lo hizo bien? ¿O un ejemplo de una que lo hizo mal y tú lo viviste?" },
      { role: 'user', content: "El año pasado, otro proyecto solar más pequeño en Maui — un amigo trabajó allí. Le pagaban $18 la hora cuando el sindicato local pagaba $32 por el mismo trabajo. La empresa decía que era 'oportunidad para la comunidad'. Para mí eso es explotación con palabras bonitas. Si quieren beneficiar a la comunidad, paguen lo que se paga aquí." },
      { role: 'assistant', content: "$18 versus $32 por el mismo trabajo, llamado 'oportunidad para la comunidad' — entiendo por qué eso te marca. ¿Hay algo concreto que el desarrollador podría comprometerse a hacer que cambiaría tu posición? No tiene que ser perfecto, solo algo real." },
      { role: 'user', content: "Sí. Project Labor Agreement con los sindicatos locales. Si hacen eso, los precios son justos y los trabajadores tienen protección. Y un compromiso por escrito de que después de construido, el mantenimiento contrata empresas locales — gente como yo. No otra subcontratista de afuera." },
      { role: 'assistant', content: "Project Labor Agreement con sindicatos locales para la construcción, y un compromiso por escrito para contratar empresas locales para el mantenimiento. ¿Algo más que quieras agregar antes de cerrar?" },
      { role: 'user', content: "Sí. Diles que la comunidad latina aquí es parte de esta isla, no aparte. Hablamos español pero pagamos los mismos impuestos, mandamos a los hijos a la misma escuela. Si solo hacen reuniones en inglés a las 6 de la tarde — cuando trabajamos — están diciendo que no nos quieren ahí." },
    ],
    recap: `Esto es lo que escuché de ti, Roberto.

Tienes una empresa de paisajismo con ocho empleados. Tu posición sobre el proyecto es complicada — apoyas la idea de que se necesitan trabajos aquí, pero te preocupa el patrón: empresas grandes vienen, contratan barato a gente de afuera, y se van cuando terminan.

Diste un ejemplo específico: el año pasado en Maui, un amigo trabajó en otro proyecto solar y le pagaban $18 la hora cuando el sindicato local pagaba $32 por el mismo trabajo. La empresa lo llamó "oportunidad para la comunidad". Tú lo llamaste explotación con palabras bonitas.

Dijiste que dos compromisos concretos cambiarían tu posición:
- Un Project Labor Agreement con los sindicatos locales para la fase de construcción
- Un compromiso por escrito de contratar empresas locales para el mantenimiento después, no subcontratistas de afuera

Cerraste pidiendo que el desarrollador entienda que la comunidad latina aquí es parte de la isla, no aparte — y que reuniones solamente en inglés a las 6 de la tarde son una forma de excluir.

¿Capté todo, o hay algo que ajustar?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 52, capturedVia: 'screen', capturedAt: '2026-05-04T13:18:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 28, capturedVia: 'screen', capturedAt: '2026-05-04T13:18:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 48, capturedVia: 'screen', capturedAt: '2026-05-04T13:19:00Z' },
      { signifierId: 'community_impact',   dyadValue: 50, capturedVia: 'screen', capturedAt: '2026-05-04T13:19:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.45, b: 0.15, c: 0.40 }, capturedVia: 'screen', capturedAt: '2026-05-04T13:20:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.60, b: 0.10, c: 0.30 }, capturedVia: 'screen', capturedAt: '2026-05-04T13:20:30Z' },
    ],
  },

  // ---- 5. SARAH — climate organiser, conditional support ----
  {
    slug: 'sarah-organiser',
    language: 'en',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Climate organiser, 28, conditional support, wants binding CBP + Hawaiian-led oversight',
    createdAt: '2026-05-04T11:30:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'en',
      relationshipToArea: 'lives_nearby',
      gender: 'woman',
      indigenous: 'prefer_not_to_say',
      ageRange: '25_34',
      preStance: 62,
      capturedAt: '2026-05-04T11:30:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: true,
      mayShareInPublicReport: true,
      notes: 'Use the pseudonym "T.K." in any public material. Yes to all three sharing options.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Hi. I work in climate organising in the islands and I've been tracking this proposal. I'll engage but I want to be clear — I'm conditionally supportive. The default is I want clean energy. The conditions matter." },
      { role: 'assistant', content: "Got it — default yes, conditions matter. That's clear. What are the conditions, in your own words?" },
      { role: 'user', content: "Three things. One: a binding Community Benefits Package, not a feel-good one. The HECO standard of $3,000 per megawatt per year is a floor, not a ceiling, and the use of those funds has to be community-decided, not developer-decided. Two: Hawaiian-led oversight on the project from siting through operation. That means a Native Hawaiian seat with veto power over cultural-site decisions, not advisory. Three: a published timeline for community accountability — not 'we'll engage,' but specific milestones with specific decisions on the table." },
      { role: 'assistant', content: "All three are specific and structural. Have you seen any project, anywhere, get even one of these right — so I can understand what 'right' looks like to you?" },
      { role: 'user', content: "Partial yes. The Kauai Island Utility Cooperative has elements of community-decided benefits because it's actually a co-op. So the structure is fundamentally different. The DC Greenpower Authority did binding tiered-tariff stuff. Neither is a clean transplant to this project, but both show the patterns are buildable. There's no excuse for 'too hard.'" },
      { role: 'assistant', content: "So precedents exist; the gap is willingness, not feasibility. Can I ask: what concerns you about how this specific project is being run right now — anything you've seen so far that worries you?" },
      { role: 'user', content: "Yes. Two things. The community engagement budget the developer disclosed in the RFP response was something like $80K total for outreach. That's not engagement, that's a marketing line item. And the cultural impact assessment was contracted to a firm based in California. With respect — they're not the right people for that work in Hawai'i." },
      { role: 'assistant', content: "Both of those are concrete. $80K for engagement reads as performative; mainland firm doing cultural impact assessment — that's a specific procedural failure. Anything else you'd want me to make sure is in the record?" },
      { role: 'user', content: "Just that — clean energy in Hawai'i is going to happen, has to happen for climate reasons. The fight is whether it happens with our communities or to them. And right now it's tilting toward 'to.' That has to change." },
    ],
    recap: `Here's what I heard from you.

You're a climate organiser in the islands, and your default position on the project is yes — but you're conditionally supportive. The conditions, in your words, are three:

- A binding Community Benefits Package above HECO's $3,000/MW floor, with use-of-funds decided by the community, not the developer
- Hawaiian-led oversight from siting through operation, including a Native Hawaiian seat with veto power on cultural-site decisions — not advisory
- A published timeline of community accountability with specific milestones and specific decisions on the table

You named two precedents — Kauai Island Utility Cooperative for community-decided benefits and the DC Greenpower Authority for binding tiered-tariff structures — to show that the patterns are buildable. So the gap is willingness, not feasibility.

You also raised two specific worries about how this project is being run now: the developer's disclosed $80K community-engagement budget reads as performative, not real, and the cultural impact assessment was contracted to a California firm — wrong people for that work in Hawai'i.

You closed with a frame: clean energy here is going to happen for climate reasons. The fight is whether it happens with communities or to them. Right now it's tilting toward "to."

Sound right? Anything to refine?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 72, capturedVia: 'screen', capturedAt: '2026-05-04T11:58:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 42, capturedVia: 'screen', capturedAt: '2026-05-04T11:58:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 67, capturedVia: 'screen', capturedAt: '2026-05-04T11:59:00Z' },
      { signifierId: 'community_impact',   dyadValue: 76, capturedVia: 'screen', capturedAt: '2026-05-04T11:59:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.50, b: 0.35, c: 0.15 }, capturedVia: 'screen', capturedAt: '2026-05-04T12:00:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.75, b: 0.05, c: 0.20 }, capturedVia: 'screen', capturedAt: '2026-05-04T12:00:30Z' },
    ],
  },

  // ---- 6. MARÍA — hesitant, declines most consent ----
  {
    slug: 'maria-farmworker',
    language: 'es',
    status: 'consented',
    identification: 'anonymous',
    personaSummary: 'Trabajadora agrícola inmigrante reciente, 41, miedo a represalias; declina compartir',
    createdAt: '2026-05-04T19:20:00Z',
    participationConsentState: 'questions_first',
    demographics: {
      language: 'es',
      relationshipToArea: 'works_or_business',
      gender: 'woman',
      indigenous: 'prefer_not_to_say',
      ageRange: '35_49',
      preStance: 38,
      capturedAt: '2026-05-04T19:20:00Z',
    },
    consent: {
      mayShareWithDeveloper: false,
      mayShareWithFunder: false,
      mayShareInPublicReport: false,
      notes: 'No quiero que nada de esto se comparta con nadie. Anónima. Borren mi conversación si pueden.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING_ES, stage: 'opening' },
      { role: 'user', content: "Hola. Estoy aquí porque alguien me dijo que podía hablar con ustedes. Pero no estoy segura de si quiero." },
      { role: 'assistant', content: "Está bien — no tiene que estar segura. Esta conversación es voluntaria de verdad. Puede irse en cualquier momento, no contestar nada, o solo escuchar. ¿Quiere que le explique más sobre quién soy y qué hago, antes de decidir?" },
      { role: 'user', content: "Sí. Trabajo en el campo. No tengo papeles. Si comparto algo y llega a las personas equivocadas — pueden pasar cosas. ¿Entiendes?" },
      { role: 'assistant', content: "Entiendo. Y le agradezco que me lo dijera. Quiero ser muy clara con usted: nada de lo que diga aquí se comparte con nadie a menos que usted lo apruebe explícitamente al final, y aún entonces, usted decide qué se comparte y con quién. Si usted dice 'no compartir nada,' yo respeto eso completamente. ¿Quiere parar aquí, o seguir un poquito y ver cómo se siente?" },
      { role: 'user', content: "Puedo seguir un poquito. Solo quería decir una cosa — los trabajadores de campo somos los que más vamos a sentir si cambia el agua, si cambia el aire por construcción. Y nadie nos pregunta. Nunca." },
      { role: 'assistant', content: "Eso lo entiendo. Y es importante. Si quiere parar ahí, lo paramos. Si quiere agregar algo más, también está bien. Lo que usted decida." },
      { role: 'user', content: "Solo eso. Gracias por escuchar. Pero por favor, no compartan nada. Ni con el desarrollador, ni con nadie." },
    ],
    recap: `Solo voy a confirmar lo que escuché — y nada de esto sale de aquí, como usted me pidió.

Compartió que trabaja en el campo, que no tiene papeles, y que los trabajadores de campo son quienes más van a sentir cambios en el agua o en el aire por la construcción — y nadie les pregunta. Pidió específicamente que nada de lo que dijo se comparta con el desarrollador, ni con inversionistas, ni en ningún informe público.

Voy a respetar eso completamente. Su conversación se queda aquí. Gracias por el tiempo y por la confianza de hablar al menos un poco.`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 43, capturedVia: 'screen', capturedAt: '2026-05-04T19:48:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 18, capturedVia: 'screen', capturedAt: '2026-05-04T19:48:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 32, capturedVia: 'screen', capturedAt: '2026-05-04T19:49:00Z' },
      { signifierId: 'community_impact',   dyadValue: 38, capturedVia: 'screen', capturedAt: '2026-05-04T19:49:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.30, b: 0.10, c: 0.60 }, capturedVia: 'screen', capturedAt: '2026-05-04T19:50:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.65, b: 0.10, c: 0.25 }, capturedVia: 'screen', capturedAt: '2026-05-04T19:50:30Z' },
    ],
  },

  // ---- 7. DANIEL — Filipino-American homeowner, mixed ----
  {
    slug: 'daniel-homeowner',
    language: 'en',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Filipino-American homeowner, 44, property + traffic; supports clean energy in principle',
    createdAt: '2026-05-05T09:42:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'en',
      relationshipToArea: 'lives_nearby',
      gender: 'man',
      indigenous: 'no',
      ageRange: '35_49',
      capturedAt: '2026-05-05T09:42:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: true,
      mayShareInPublicReport: false,
      notes: 'First name is fine. I\'m okay with the developer and funders hearing this — these are practical concerns, not secret. Keep me out of any public report though.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Hi I'm Daniel. I own a place about a mile and a half from the proposed site. Not adjacent — close. I support clean energy in general. I have practical concerns. Happy to walk through them." },
      { role: 'assistant', content: "Hi Daniel. Practical concerns are exactly what I'm hoping to hear. Where do you want to start — what's the first practical thing on your mind?" },
      { role: 'user', content: "Property value. I bought my place ten years ago, view of the mountain, quiet. If 200 acres of solar goes in nearby with construction, then permanent infrastructure — what does that do to the value? I've looked online and I get conflicting answers. Some say no impact, some say 5-10% drop within a mile. I don't know what to believe." },
      { role: 'assistant', content: "The conflicting answers part is real — there's actual academic research on this and it's mixed by region and project type. Setting aside what the studies say generally, what would you want to see in this specific project to feel the value impact is being taken seriously?" },
      { role: 'user', content: "Two things would help. One — a property value protection clause in the agreement. Some projects do it: if your home appraises lower because of the project within X years, the developer covers the difference. Two — view-shed mitigation. Like, where exactly are the panels, can the tallest infrastructure be set back, can there be a vegetative buffer along the road." },
      { role: 'assistant', content: "Both very specific and both have precedent. Beyond property value, you mentioned construction earlier — what worries you there?" },
      { role: 'user', content: "Traffic mostly. The road in is two lanes, no shoulder. Construction trucks for two years on that road — kids walking to the bus stop, tourists who don't know the road, my elderly neighbors. There needs to be a real traffic plan. Hours, escorts, alternative route if there is one." },
      { role: 'assistant', content: "Traffic plan with hours, escorts, alternative routing if available — that's clear. Is there anything you'd want this developer to know that would actually shift you from 'support with concerns' to 'support, period'?" },
      { role: 'user', content: "Honestly, transparency. Show me the construction plan. Show me the hydrology study. Don't make me FOIA it. If the answers are good I'll relax. If they're not good, I'll want changes. But I can't trust what I can't see." },
    ],
    recap: `Here's what I heard, Daniel.

You own a home about a mile and a half from the proposed site, with a mountain view, and you bought it ten years ago. Your default position is support for clean energy, but you have practical concerns.

Concern one: property value. You've researched and found conflicting answers — some studies say no impact, some say 5–10% drop within a mile. You said two things would help: a property-value protection clause where the developer covers an appraised loss within X years, and view-shed mitigation (setbacks for tall infrastructure, vegetative buffer along the road).

Concern two: construction traffic. The access road is two-lane, no shoulder, with kids walking to the bus stop, tourists, and elderly neighbours. You want a real traffic plan with construction hours, escorts, and alternative routing.

You closed with the most actionable ask: transparency. Show the construction plan and the hydrology study without requiring a FOIA. You'd shift from "support with concerns" to "support, period" if the answers are good — and ask for changes if they're not.

Right? Anything to add?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 58, capturedVia: 'screen', capturedAt: '2026-05-05T10:18:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 47, capturedVia: 'screen', capturedAt: '2026-05-05T10:18:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 54, capturedVia: 'screen', capturedAt: '2026-05-05T10:19:00Z' },
      { signifierId: 'community_impact',   dyadValue: 56, capturedVia: 'screen', capturedAt: '2026-05-05T10:19:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.60, b: 0.20, c: 0.20 }, capturedVia: 'screen', capturedAt: '2026-05-05T10:20:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.45, b: 0.20, c: 0.35 }, capturedVia: 'screen', capturedAt: '2026-05-05T10:20:30Z' },
    ],
  },

  // ---- 8. AIYANA — younger Native Hawaiian, climate-jobs framing ----
  {
    slug: 'aiyana-youth',
    language: 'en',
    status: 'consented',
    identification: 'self_described',
    personaSummary: 'Native Hawaiian, 23, climate + jobs + cultural continuity; partial consent',
    createdAt: '2026-05-05T16:55:00Z',
    participationConsentState: 'yes_begin',
    demographics: {
      language: 'en',
      relationshipToArea: 'family_or_land',
      gender: 'nonbinary',
      indigenous: 'yes',
      indigenousSelfDescribe: 'Kanaka Maoli (Native Hawaiian)',
      ageRange: '18_24',
      capturedAt: '2026-05-05T16:55:00Z',
    },
    consent: {
      mayShareWithDeveloper: true,
      mayShareWithFunder: true,
      mayShareInPublicReport: false,
      notes: 'First name. The developer and funder can hear it. Not a public report yet — I want to see what they do with it first.',
    },
    turns: [
      { role: 'assistant', content: HONUA_OPENING, stage: 'opening' },
      { role: 'user', content: "Aloha. I'm Aiyana. I'm 23, Hawaiian, born and raised here. I've been thinking about this project a lot because — I don't know how to say this without sounding cliché — I'm trying to figure out if there's a future for someone like me on this island that isn't either tourism or moving to Vegas." },
      { role: 'assistant', content: "Aloha, Aiyana. That doesn't sound cliché — it sounds true. Tell me more about what 'a future on this island' looks like to you, and where this project fits or doesn't fit into that?" },
      { role: 'user', content: "It looks like work that pays a living wage. It looks like being able to afford rent. It looks like my elders not being the last ones to speak Hawaiian fluently. It looks like the projects on our land actually being run by us, eventually. The solar project — okay, I'm cautiously into it. But only if the jobs are real and the language piece is real." },
      { role: 'assistant', content: "That phrase — 'the projects on our land actually being run by us, eventually' — can you say more? What would 'run by us' look like in this kind of project? Workforce? Ownership? Decision-making?" },
      { role: 'user', content: "All three. Workforce in the short term — apprenticeships, real ones, with a path to journeyman. Decision-making in the medium term — community board, real authority not advisory. And ownership in the long term — community solar that lets us actually own a percentage. None of those are crazy. They exist elsewhere. They just don't exist here yet because nobody made them." },
      { role: 'assistant', content: "Workforce, governance, and ownership — short, medium, and long term. That's a sequenced ask. On the language piece you mentioned earlier — you said your elders being the last fluent speakers — can I ask what specifically would matter on this project for that?" },
      { role: 'user', content: "Easy stuff. 'Olelo Hawai'i on signage. Hawaiian-language community meetings — at least quarterly. Documents in Hawaiian for the people who want it. Hire fluent-speaker liaisons, paid the same as the English-speaking community-relations people. It's not a big lift. It's a respect lift." },
      { role: 'assistant', content: "Got it. One last question — what happens if this project goes in and doesn't do any of those things? What does that mean for you and people in your generation?" },
      { role: 'user', content: "It means another generation of us learning that 'community input' is theatre. It means we leave. Or we stop showing up. Both are losses. The developer probably sees this as a 100-megawatt-hour battery problem. For us it's about whether we still get to be a people who shape the place we're from." },
    ],
    recap: `Here's what I heard from you, Aiyana.

You're 23, Hawaiian, born and raised here. You're trying to figure out if there's a future on the island for someone like you that isn't either tourism or leaving for Las Vegas. You're cautiously into the solar project, but only if the jobs piece and the language piece are real.

You laid out a three-part ask, sequenced over time:
- Short term: real apprenticeships with a path to journeyman, not symbolic ones
- Medium term: a community board with real authority, not advisory
- Long term: community ownership of a percentage of the project — community-solar style

On 'Olelo Hawai'i specifically: signage in Hawaiian, quarterly Hawaiian-language community meetings, documents available in Hawaiian for those who want them, and fluent-speaker liaisons paid at the same rate as English-speaking community-relations staff.

You closed with a frame that landed: if this project does none of those things, another generation learns that "community input" is theatre. People leave. Or stop showing up. Both are losses. For the developer this might be a 100-MWh battery problem; for you it's about whether your generation still gets to shape the place you're from.

Right reading? Anything off?`,
    signifierResponses: [
      { signifierId: 'stance',             dyadValue: 77, capturedVia: 'screen', capturedAt: '2026-05-05T17:28:00Z' },
      { signifierId: 'trust_developer',    dyadValue: 56, capturedVia: 'screen', capturedAt: '2026-05-05T17:28:30Z' },
      { signifierId: 'engagement_respect', dyadValue: 62, capturedVia: 'screen', capturedAt: '2026-05-05T17:29:00Z' },
      { signifierId: 'community_impact',   dyadValue: 73, capturedVia: 'screen', capturedAt: '2026-05-05T17:29:30Z' },
      { signifierId: 'project_framing',    triadCoords: { a: 0.45, b: 0.45, c: 0.10 }, capturedVia: 'screen', capturedAt: '2026-05-05T17:30:00Z' },
      { signifierId: 'who_decides',        triadCoords: { a: 0.80, b: 0.05, c: 0.15 }, capturedVia: 'screen', capturedAt: '2026-05-05T17:30:30Z' },
    ],
  },
];
