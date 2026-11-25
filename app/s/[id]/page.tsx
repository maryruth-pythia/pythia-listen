import { getSurvey } from '@/lib/db';
import PublicSurvey from '@/components/survey/PublicSurvey';
import ConversationalSurvey from '@/components/survey/ConversationalSurvey';
import type { SurveySpec } from '@/components/survey/SurveyForm';

export const dynamic = 'force-dynamic';

/** Public respondent page — no login required (allow-listed in middleware). */
export default async function PublicSurveyPage(
  props: {
    params: Promise<{ id: string }>;
  }
) {
  const params = await props.params;
  const survey = await getSurvey(params.id);
  if (!survey || survey.status !== 'published') {
    return (
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '48px 20px' }}>
        <p style={{ color: '#6A5F74' }}>This survey isn’t available.</p>
      </div>
    );
  }
  const language = survey.languages?.[0] ?? 'en';
  return (
    <div style={{ minHeight: '100vh', background: '#F7F5FB' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 20px' }}>
        {(survey.spec as { conversational?: boolean }).conversational ? (
          <ConversationalSurvey
            id={survey.id}
            spec={survey.spec as unknown as { title: string; intro: string; closing?: string }}
            language={language}
          />
        ) : (
          <PublicSurvey
            id={survey.id}
            spec={survey.spec as unknown as SurveySpec}
            language={language}
          />
        )}
      </div>
    </div>
  );
}
