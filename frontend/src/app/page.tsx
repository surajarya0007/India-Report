import { fetchHomeArticles } from '../lib/seo';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const initialArticles = await fetchHomeArticles();

  return <HomeClient initialArticles={initialArticles} />;
}
