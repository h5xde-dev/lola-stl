import Image from "next/image";
import Link from "next/link";
import JsonLd from "@/lib/jsonld";
import { getArticles, getSeo } from "@/lib/server/catalog";
import { SITE_URL } from "@/lib/site";
import { readMinutes } from "@/lib/md";
import { fmtDay } from "@/lib/format";

// Список статей. Кешируется как остальные страницы; публикация в админке сбрасывает кеш.
export const revalidate = 300;

export async function generateMetadata() {
  const seo = await getSeo();
  return {
    title: seo.blogTitle, description: seo.blogDescription, alternates: { canonical: "/blog" },
    openGraph: { type: "website", title: seo.blogTitle, description: seo.blogDescription, url: "/blog" },
  };
}

export default async function Blog() {
  const [list, seo] = await Promise.all([getArticles(), getSeo()]);
  return (
    <div className="inner-page">
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Blog", "@id": SITE_URL + "/blog", url: SITE_URL + "/blog", name: seo.blogTitle, description: seo.blogDescription,
        inLanguage: "ru", isPartOf: { "@id": SITE_URL + "/#site" },
        blogPost: list.map(a => ({ "@type": "BlogPosting", headline: a.title, url: `${SITE_URL}/blog/${a.slug}`, datePublished: a.date })),
      }} />
      <div className="page-title"><span className="eyebrow">Статьи</span><h1>{seo.blogTitle}</h1><p>{seo.blogDescription}</p></div>
      {list.length ? (
        <div className="article-grid">
          {list.map(a => (
            <Link key={a.id} href={`/blog/${a.slug}`} className="article-card">
              <span className="article-cover">{a.cover?.src
                ? <Image src={a.cover.src} alt={a.cover.alt || ""} fill sizes="(max-width: 640px) 100vw, 33vw" />
                : <span className="article-cover-empty" aria-hidden="true">lola.stl</span>}</span>
              <span className="article-meta">{fmtDay(a.date)} · {readMinutes(a.body)} мин</span>
              <b>{a.title}</b>
              {a.excerpt && <span className="article-excerpt">{a.excerpt}</span>}
            </Link>
          ))}
        </div>
      ) : <div className="empty-state">Статьи скоро появятся.</div>}
    </div>
  );
}
