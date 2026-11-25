import GradientHeader from '@/components/GradientHeader';
import { HubFeature, HubGroup, HubRow } from '@/components/operator/Hub';

export const metadata = { title: 'Agents · Pythia' };

export default function AgentsPage() {
  return (
    <div>
      <GradientHeader eyebrow="Operator · Agents" title="Agents" />

      <HubFeature href="/operator/agents/survey-builder" title="Survey Builder">
        Build a community survey in plain language — by voice or text, in your
        community&rsquo;s language.
      </HubFeature>

      <HubGroup
        label="Advisors"
        caption="Chat helpers that work from this project&rsquo;s own context — always with a human in the loop. Ask any of them for its sources; nothing goes out without your sign-off."
      >
        <HubRow href="/operator/agents/chief-of-staff" title="Campaigning Coach">
          Organizing strategy, relationships &amp; fact sheets.
        </HubRow>
        <HubRow href="/operator/agents/permitting-expert" title="Permitting &amp; Zoning">
          Zoning &amp; permitting — the right questions, cited.
        </HubRow>
        <HubRow href="/operator/agents/political-foresight" title="Political Foresight">
          What&rsquo;s coming in law &amp; the market.
        </HubRow>
      </HubGroup>
    </div>
  );
}
