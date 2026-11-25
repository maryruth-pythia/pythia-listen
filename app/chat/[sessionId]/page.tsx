import { notFound } from 'next/navigation';
import { getSession, listMessages, getProject } from '@/lib/db';
import { selectedSignifiers } from '@/lib/signifiers';
import Chat from '@/components/Chat';

export const dynamic = 'force-dynamic';

export default async function ChatPage(
  props: {
    params: Promise<{ sessionId: string }>;
    searchParams: Promise<{ voice?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const session = await getSession(params.sessionId);
  if (!session) notFound();
  const messages = await listMessages(session.id);
  const project = await getProject(session.projectId);
  const signifiers = selectedSignifiers(project?.signifierIds);

  return (
    <Chat
      session={session}
      initialMessages={messages}
      signifiers={signifiers}
      photovoiceEnabled={project?.photovoiceEnabled ?? false}
      mappingEnabled={project?.mappingEnabled ?? false}
      demographicsEnabled={project?.demographicsEnabled ?? true}
      mapCenter={project?.mapCenter}
      voiceFirst={searchParams.voice === '1'}
    />
  );
}
