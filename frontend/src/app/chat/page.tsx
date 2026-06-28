import type { Metadata } from 'next';
import Layout from '../../components/Layout';
import ChatClient from './ChatClient';
import { SITE_NAME, siteUrl } from '../../lib/seo';

export const metadata: Metadata = {
  title: `Chat | ${SITE_NAME}`,
  description: 'Ask questions and get grounded answers from India Reports articles.',
  alternates: {
    canonical: '/chat',
  },
  openGraph: {
    title: `Chat | ${SITE_NAME}`,
    description: 'Closed-domain article chat for India Reports.',
    url: `${siteUrl}/chat`,
    type: 'website',
    siteName: SITE_NAME,
  },
};

export default function ChatPage() {
  return (
    <Layout showNav={false} showBreakingTicker={false} hideHeader={true} hideFooter={true}>
      <ChatClient />
    </Layout>
  );
}
