import { notFound, redirect } from 'next/navigation';
import { articlePath, fetchArticleForSeo } from '../../../lib/seo';

type ArticlePageParams = {
  params: Promise<{ id: string }>;
};

export default async function ArticleLegacyPage({ params }: ArticlePageParams) {
  const { id } = await params;
  const article = await fetchArticleForSeo(id);

  if (!article) {
    notFound();
  }

  redirect(articlePath(article.id, article.headline));
}
