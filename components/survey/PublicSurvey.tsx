'use client';

import { useState } from 'react';
import SurveyForm, { type SurveySpec } from './SurveyForm';
import Turnstile from './Turnstile';

/** Client wrapper for the public respondent page: renders the fillable form
 *  and posts the answers to the public responses endpoint. */
export default function PublicSurvey({
  id,
  spec,
  language,
}: {
  id: string;
  spec: SurveySpec;
  language: string;
}) {
  const [token, setToken] = useState<string | undefined>(undefined);
  async function submit(answers: Record<string, string | number>) {
    try {
      await fetch(`/api/surveys/${id}/responses`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ answers, turnstileToken: token }),
      });
    } catch {
      /* best-effort; SurveyForm shows its own confirmation on submit */
    }
  }
  return (
    <>
      <SurveyForm spec={spec} language={language} onSubmit={submit} />
      <Turnstile onVerify={setToken} />
    </>
  );
}
