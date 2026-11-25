/**
 * English UI copy.
 *
 * The AI itself responds in English when language='en'. This file is for UI
 * chrome (buttons, labels, placeholders, headings) — not for AI output.
 */

export const en = {
  common: {
    back: 'Back',
    next: 'Next',
    cancel: 'Cancel',
    confirm: 'Confirm',
    done: 'Done',
    edit: 'Edit',
    optional: 'optional',
    skip: 'Skip',
    continue: 'Continue',
  },
  beginConsent: {
    yes: 'Yes, begin',
    questions: 'I have questions first',
    no: "No, I'd rather not",
    declinedHeading: 'Thank you for your time.',
    declinedBody:
      "We won't keep any record of this. If you change your mind later, you can always come back.",
  },
  demographics: {
    heading: 'A few quick things before we start',
    intro:
      'All of these are optional. Skip anything you\'d rather not share. We use this to make sure different voices are reflected in what gets reported back — never to identify you.',
    languageLabel: 'Language for this conversation',
    relationshipLabel: 'How you\'re connected to the area',
    genderLabel: 'Gender',
    indigenousLabel: 'Do you identify as Indigenous?',
    indigenousFollowupLabel:
      'Which people, nation, or community? (optional)',
    indigenousFollowupHint:
      'e.g., Native Hawaiian, Sami, Adivasi, Quechua, Yoruba, Maori, Lumad, San — whatever you call yourselves.',
    ageLabel: 'Age range',
    submit: 'Continue to conversation',
    skipAll: 'Skip and continue',
    selfDescribePlaceholder: 'How would you describe it?',
    options: {
      language: {
        en: 'English',
        es: 'Español',
        olelo: "ʻŌlelo Hawaiʻi (coming soon)",
        other: 'Another language',
      },
      relationship: {
        lives_immediate: 'I live in the immediate area',
        lives_nearby: 'I live nearby',
        works_or_business: 'I work or own a business here',
        family_or_land: "I'm connected through family or land",
        visiting: "I'm visiting",
        other: 'Other',
        prefer_not_to_say: 'Prefer not to say',
      },
      gender: {
        woman: 'Woman',
        man: 'Man',
        nonbinary: 'Non-binary',
        two_spirit: 'Two-Spirit',
        genderqueer: 'Genderqueer',
        trans_woman: 'Trans woman',
        trans_man: 'Trans man',
        self_describe: "I'd like to self-describe",
        prefer_not_to_say: 'Prefer not to say',
      },
      indigenous: {
        yes: 'I identify as Indigenous',
        no: 'I do not identify as Indigenous',
        prefer_not_to_say: 'Prefer not to say',
      },
      age: {
        '18_24': '18–24',
        '25_34': '25–34',
        '35_49': '35–49',
        '50_64': '50–64',
        '65_plus': '65+',
        prefer_not_to_say: 'Prefer not to say',
      },
    },
  },
  language: {
    pickHeading: 'Pick a language to begin',
    pickSub:
      'Pythia will speak with you in the language you choose. You can change it any time by starting again.',
    en: 'English',
    es: 'Español',
  },
  start: {
    back: '← Back',
    tag: 'Community',
    h: 'Before we begin',
    languageLabel: 'Language for the conversation',
    modeLabel: 'How would you like to participate?',
    modeType: 'Type my answers',
    modeVoice: 'Speak my answers (Pythia reads aloud and listens)',
    intro:
      'You are about to have a private conversation with Pythia. Pythia is an AI assistant that listens to people in communities about proposed clean-energy projects. The conversation is voluntary — you can stop, skip any question, or refuse to answer at any time. Nothing you say will be shared with anyone unless you give explicit permission at the end.',
    begin: 'Begin conversation',
  },
  chat: {
    placeholder: 'Type your response…',
    placeholderFirstTurn: 'What do you think about the proposed energy project — or ask Pythia anything first…',
    send: 'Send',
    wrapUp: 'I’d like to wrap up',
    pythiaIsTyping: 'Pythia is listening…',
    error: 'Something went wrong. Try again, or refresh the page.',
    firstTurnHint:
      'Share your thoughts about the energy project being proposed near you — concerns, questions, hopes, or anything else on your mind. There’s no right answer and no script. You can also just ask Pythia a question first. Click “I’d like to wrap up” whenever you’re ready.',
  },
  recap: {
    heading: 'Here’s what I heard',
    intro:
      'Take a moment to read this back. Tell me if I got something wrong, or if there’s something to add.',
    correct: 'Yes, this is right',
    edit: 'I’d like to correct or add something',
  },
  consent: {
    heading: 'What can we share, and with whom?',
    intro:
      'You decide what — if anything — leaves this conversation. Pick what feels right. You can also share nothing at all, and Pythia will keep what you said only for your own copy.',
    shareDeveloper: 'Share with the project developer',
    shareDeveloperHelp:
      'In a private report. Helps the developer understand community views.',
    shareFunder: 'Share with the project’s funders or investors',
    shareFunderHelp: 'In a separate brief. Same content, different audience.',
    sharePublic: 'Include in Pythia’s public report',
    sharePublicHelp: 'Used to inform broader policy and practice. No identifying details.',
    identification: 'If anything is shared, how should it refer to you?',
    identificationHelp:
      'You can stay completely anonymous, or describe yourself however you want — a pseudonym, a role like "a renter near the site," or whatever feels right. Your call.',
    idAnonymous: 'Anonymous',
    idAnonymousHelp: 'Just "a community participant" — no other details.',
    idSelfDescribed: 'Identify me — I’ll describe how',
    idSelfDescribedHelp:
      'You choose the descriptor. Could be a pseudonym, a role, or anything else you want.',
    idDescriptionPlaceholder:
      'e.g., "Maya," "a farmer near the site," "a Native Hawaiian elder"',
    notes: 'Anything else you want us to know about how to handle what you shared',
    submit: 'Save my permissions',
  },
  advocacy: {
    heading: 'For you — what you said and how it might help',
    intro:
      'A short summary you can keep, share, or use to advocate for yourself. This is yours. Pythia does not need anything else from you.',
    done: 'I’m done',
  },
  panels: {
    map: {
      heading: 'Mark the map with what matters to you',
      intro:
        'Tap anywhere to drop a pin. For each pin, you can add a label and a note. This helps us understand WHERE your specific concerns are, not just what they are.',
      submit: 'Save my pins',
      skip: 'Skip the map and continue',
      labelPlaceholder: 'Short label (e.g., "noise", "cultural site")',
      notePlaceholder: 'Why does this place matter?',
    },
    photo: {
      heading: 'If you’d like, share one or more photos',
      intro:
        'Sometimes a photo tells what words can’t. Share what matters to you about this place — optional. Each photo can carry a short note.',
      add: 'Show us in a photo what you want to protect',
      captionPlaceholder: 'What’s in this photo? Why does it matter?',
      submit: 'Save my photos',
      skip: 'Skip photos and continue',
    },
    stanceQ: {
      heading: 'One question about the project',
      intro: 'Optional — helps us see whether the conversation shifts any views.',
    },
  },
};

export type CopyEN = typeof en;
