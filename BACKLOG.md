# Pythia Listen — Backlog

Improvements identified but not yet started. Captured 2026-05-06.

> **Read me before picking anything up.** Each item below has a short note on what it means, why it matters, and the most obvious dependency or consideration. None of these are designed yet — they need a brief shaping conversation with Maryruth before code work begins.

---

## 1. Dummy data for testing reports

**What:** Seed a set of fake-but-realistic completed conversations into the data store, so synthesis runs and Tier 1 reports can be demoed without having to do live conversations every time.

**Why it matters:** Right now to demo the synthesis or Tier 1 surface to a fellowship reviewer or pilot client, you have to (a) start a conversation, (b) actually role-play through it to the consent gate, (c) tick the consent boxes, (d) repeat 3–4 times for synthesis to feel meaningful. That's 30+ minutes of stage-setting before the demo even starts.

**Implementation notes:**
- Create `data/seed/sample-conversations.json` with 4–6 fully-formed transcripts (user/assistant message arrays), each with a synthesised consent record.
- Mix of personas (skeptical farmer, supportive resident, native Hawaiian elder, business owner, renter).
- Mix of EN and ES.
- Add a `npm run db:demo` script that loads them into the runtime store.
- Probably a "Demo data loaded" indicator in the operator UI so the user can tell what's real vs. seeded.
- Be careful that dummy conversations are clearly marked (different ID prefix, e.g., `DEMO-...`) so the operator can tell them apart from real ones.

---

## 2. Region-specific legal documents the AI knows about

**What:** Equip the AI with knowledge of the legal and regulatory framework for community engagement in the participant's region. FPIC frameworks, country-specific consultation requirements, EIS / EIA processes, indigenous rights law, applicable case precedent.

**Why it matters:** Right now the AI knows the project but not the participant's rights. A real community member has specific legal levers in their jurisdiction (FPIC under UNDRIP, NEPA in the US, EIS under Hawai'i state law, Section 106, etc.). The AI should be able to say "you have the right to X" or "the developer is required to do Y" when relevant — that's part of helping people advocate for themselves.

**Implementation notes:**
- Build `lib/legal/[region].ts` files keyed by jurisdiction (e.g., `hawaii-us`, `mexico`, `philippines`, `chile`).
- Each contains: applicable laws, key rights, mandatory consultation thresholds, grievance mechanisms.
- Project record gets a `region` field that points to the right legal context.
- System prompt assembly includes the legal context as a block.
- Sources matter — cite where each claim comes from (statute, regulation, treaty) so the AI can quote provenance if asked.
- Decision: do we curate ourselves (slow, accurate) or use a RAG approach over public legal databases (fast, risk of hallucination)?
- Engagement-guide caution: legal info should empower the participant, not overwhelm. Surface only when relevant.

---

## 3. Consent at the beginning AND at the end

**What:** In addition to the recap-stage consent gate at the end, ask for explicit consent at the start before the substantive conversation begins.

**Why it matters:** The engagement guide is unambiguous: "Get explicit consent before substantive questions begin." Right now Pythia discloses what it is and asks "would you like to begin?" — but doesn't capture a structured consent record at that moment. The end-of-conversation consent gate covers what may be SHARED, but not whether the participant agreed to PARTICIPATE in the first place. These are two different consents.

**Implementation notes:**
- Two-stage consent record on the session: `participationConsent` (start) and `sharingConsent` (end). Currently we only have the latter.
- New UI: after the FPIC opening message, before the AI starts asking story-frame questions, surface a brief consent confirmation. "Are you happy to continue?" with [yes / no / I have questions first].
- "I have questions first" routes back to the AI to answer questions before asking again.
- "No" gracefully closes the session with a thank-you, no data retained beyond the opening.
- Decision: should this be a UI button or just AI-driven (next message must contain consent)? UI button is cleaner for the operator audit trail.
- Update consent ledger to show both stages.

---

## 4. Demographic information at the beginning

**What:** Capture demographic information about the participant at the start — likely covering gender, indigenous identity, age range, role/relationship to the area, language preference, possibly more.

**Why it matters:** This is what enables the "secret sauce" — gender-disaggregated synthesis, identification of voices that are typically excluded, the silences analysis. Without demographic data, the synthesis can't do disaggregation. Currently we have nothing.

**Implementation notes:**
- **Tension to navigate:** the engagement guide says "don't lead with gender data or disaggregated data framings — those are our framings, not theirs." So we cannot present this as a survey.
- Probably needs to be **optional** at the start, with explicit framing of why it matters and full opt-out per field.
- Consider asking demographic questions through the AI conversationally rather than as a form — "before we begin, I'd like to ask a few questions about you, but only what you're comfortable sharing — would that be okay?"
- Capture: gender (free-text or limited), indigenous identity (free-text or yes/no), age range, role/relationship to area, primary language, any disability or accessibility needs, anything they want us to know.
- Demographics are CONFIDENTIAL — never appear in the participant-facing advocacy summary, only in the operator-side data store and only in disaggregated form in synthesis (e.g., "3 of the 4 women interviewed raised X").
- Consent ties in here: explicit consent for demographic data collection is separate from consent for conversation content.
- Decision: how much of this happens before the substantive conversation vs. surfaces naturally during it? The latter is more engagement-guide-aligned but harder to ensure coverage.

---

## 5. Project-specific research questions

**What:** Each project carries a set of explicit research questions the engagement is trying to surface — the community ask, community fears, specific concerns to probe, specific decisions the developer wants community input on.

**Why it matters:** Right now the AI runs a fully free-form conversation. The engagement guide rightly warns against survey-style questions, but there is a middle ground: the AI should know what we're trying to learn for THIS project, and weave those topics in naturally without being interrogative. Otherwise different conversations cover different ground and synthesis becomes harder.

**Implementation notes:**
- Add `researchQuestions` field to the Project model: an array of `{ question, importance, framingHints }`.
- Examples: "What does the community want from this project?", "What are the community's specific fears?", "Which existing local institutions should the developer route engagement through?", "What would 'good' engagement look like to this community?"
- These are NOT questions the AI asks verbatim. They're guidance for the AI's listening — "by the end of this conversation, you should have heard the participant's perspective on the following, if they bring relevant content."
- The AI weaves these in via story-frame questions, not surveys.
- After the conversation, a "coverage" indicator in the operator transcript view shows which research questions were addressed and which weren't.
- Synthesis uses research questions as its scaffold: themes are organised around what was asked, not what was raised.
- New project form (`/operator/projects/new`) gets a research-questions input.
- Decision: are research questions the same for every conversation in a project, or do they evolve as the engagement progresses? Probably evolve — earlier conversations inform later questions.

---

## 6. Integrate the new behaviours into the AI's conduct guardrails

**What:** Once items 1–5 are designed, the Community Voices First conduct guardrails (currently encoded in `lib/principles.ts`) need to be updated so they explicitly govern how the AI handles each new behaviour. The engagement guide is the rulebook — the rulebook needs an entry for every new thing the AI can do.

**Why it matters:** Each new behaviour creates a new way the AI can do harm if it isn't governed. Examples:
- *Demographics* → rules on how to ask, when to skip, how to refuse pressure to disclose, never repeating identity back as a label.
- *Legal information* → rules on accuracy (never invent a right that doesn't exist in the jurisdiction), when to cite, when to suggest the participant talk to a lawyer rather than rely on the AI.
- *Research questions* → rules on how to weave them in without sounding like a survey; what to do when the participant clearly doesn't want to discuss a research question.
- *Beginning consent* → rules on what happens if the participant says no, how to honour partial consent, never re-asking after a refusal.
- *Dummy data demos* → rules on how the AI signals that demo data is fake (never claim a real participant said something a fake one said).

Without this layer, the new features risk eroding the very independence and FPIC posture the engagement guide is designed to protect.

**Implementation notes:**
- Treat as a final pass after items 1–5 are designed but before any of them ships.
- Update `lib/principles.ts` with new principle blocks for each behaviour (alongside the existing identity / FPIC / question-framing / do-not-lead-with / do-no-harm / shared-interests / closing / tone / structural-tension blocks).
- Each new principle block should follow the same shape: a short list of imperatives, written for the AI but readable as policy by a human reviewer.
- Update the Community Voices First Engagement Guide doc to mirror the code changes — code and doc should not drift.
- Pair this work with a transcript-review pass: pick 5–10 conversations from the live system and check the AI's actual behaviour against the new principles, before declaring the integration done.
- Decision: which principles are hard guardrails (AI refuses) vs. soft guidance (AI prefers to follow)? Demographics-disclosure refusal should be a hard guardrail; tone/style is soft.

---

## Notes on doing this work

- Do NOT start any of this without a shaping conversation with Maryruth — each item has design decisions that need to be made before code.
- Items 1–5 are listed in roughly the order I'd recommend tackling them: (1) is the lowest-risk and unlocks demos; (2) is highest-effort but highest-leverage for product credibility; (3) and (4) are the most engagement-guide-sensitive and need the most care; (5) is the most architecturally interesting (changes the data model + synthesis pipeline).
- Several items interact: (3), (4), and (5) all need to be designed together because they all happen at the start of the conversation and all touch the consent record.
- (6) is a final pass that ties them all back to the rulebook — should not ship before any of (1)–(5) ship, but doesn't need to wait for all five.
