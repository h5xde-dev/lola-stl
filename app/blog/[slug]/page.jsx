import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import JsonLd from "@/lib/jsonld";
import ProductCard from "@/components/ProductCard";
import { getArticle, getModels } from "@/lib/server/catalog";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { ORG_ID } from "@/lib/schema";
import { Markdown, plainText, readMinutes } from "@/lib/md";
import { fmtDay } from "@/lib/format";

export const revalidate = 300;
export function generateStaticParams() { return []; }

const descOf = a => a.seoDesc || a.excerpt || plainText(a.body).slice(0, 160);
const abs = src => (src?.startsWith("/") ? SITE_URL + src : src);

export async function generateMetadata({ params }) {
  const a = await getArticle((await params).slug);
  if (!a) return { title: "Статья", robots: { index: false, follow: false } };
  const title = a.seoTitle || a.title, description = descOf(a);
  const images = a.cover?.src ? [{ url: abs(a.cover.src), alt: a.cover.alt || a.title }] : undefined;
  return {
    title, description, alternates: { canonical: `/blog/${a.slug}` },
    openGraph: { type: "article", title, description, url: `/blog/${a.slug}`, publishedTime: a.date, modifiedTime: a.updated, images },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function Article({ params }) {
  const a = await getArticle((await params).slug);
  if (!a) notFound();
  const models = await getModels();
  const bySlug = Object.fromEntries(models.map(m => [m.slug, m]));
  const url = `${SITE_URL}/blog/${a.slug}`;
  return (
    <article className="inner-page article-page">
      <JsonLd data={{
        "@context": "https://schema.org",
        "@graph": [
          { "@type": "BlogPosting", "@id": url + "#article", headline: a.title, description: descOf(a), url, mainEntityOfPage: url, inLanguage: "ru",
            datePublished: a.date, dateModified: a.updated || a.date, image: a.cover?.src ? [abs(a.cover.src)] : undefined,
            author: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }, publisher: { "@id": ORG_ID } },
          { "@type": "BreadcrumbList", itemListElement: [
            { "@type": "ListItem", position: 1, name: "Главная", item: SITE_URL + "/" },
            { "@type": "ListItem", position: 2, name: "Статьи", item: SITE_URL + "/blog" },
            { "@type": "ListItem", position: 3, name: a.title, item: url },
          ] },
        ],
      }} />
      <Link href="/blog" className="text-link back-link"><ArrowLeft size={16} /> Все статьи</Link>
      <header className="article-head">
        <span className="article-meta">{fmtDay(a.date)} · {readMinutes(a.body)} мин чтения</span>
        <h1>{a.title}</h1>
        {a.excerpt && <p className="article-lead">{a.excerpt}</p>}
      </header>
      {a.cover?.src && <div className="article-hero"><Image src={a.cover.src} alt={a.cover.alt || ""} fill priority sizes="(max-width: 900px) 100vw, 860px" /></div>}
      <div className="article-body">
        <Markdown src={a.body} renderModel={slug => (bySlug[slug] ? <ProductCard m={bySlug[slug]} /> : null)} />
      </div>
    </article>
  );
}
