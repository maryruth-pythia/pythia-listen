import GradientHeader from '@/components/GradientHeader';
import { listSessions, listProjects, listMessages } from '@/lib/db';
import ConversationsClient from '@/components/operator/ConversationsClient';

export const dynamic = 'force-dynamic';

export default async function ConversationsList() {
  const [sessions, projects] = await Promise.all([
    listSessions(),
    listProjects(),
  ]);

  const sorted = [...sessions].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const enriched = await Promise.all(
    sorted.map(async (s) => {
      const msgs = await listMessages(s.id);
      const project = projects.find((p) => p.id === s.projectId);
      return {
        session: s,
        messageCount: msgs.length,
        projectName: project?.name ?? '—',
      };
    })
  );

  return (
    <main>
      <GradientHeader eyebrow="Operator · Conversations" title="All conversations" />

      <ConversationsClient enriched={enriched} />
    </main>
  );
}
