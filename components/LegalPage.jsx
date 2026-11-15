import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/lib/md";
import { LEGAL_DATE, LEGAL_PAGES, legalDoc } from "@/lib/legal";
import { getCompany } from "@/lib/server/catalog";
import { getSettings } from "@/lib/server/repo";
import PayLogos from "./PayLogos";

// Страница документа магазина. Тексты — в lib/legal.js, реквизиты — из админки.
export async function legalMetadata(slug) {
  const p = LEGAL_PAGES.find(x => x.slug === slug);
  const d = legalDoc(slug, await getCompany(), await getSettings());
  return {
    title: p.title, description: d.desc, alternates: { canonical: "/" + slug },
    ...(p.hidden ? { robots: { index: false, follow: true } } : {}),
  };
}

export default async function LegalPage({ slug }) {
  const d = legalDoc(slug, await getCompany(), await getSettings());
  if (!d) notFound();
  return (
    <div className="inner-page legal-page">
      <nav className="legal-nav" aria-label="Документы магазина">
        {LEGAL_PAGES.filter(p => !p.hidden || p.slug === slug).map(p => (
          <Link key={p.slug} href={"/" + p.slug} aria-current={p.slug === slug ? "page" : undefined}>{p.short}</Link>
        ))}
      </nav>
      <article className="legal-doc">
        <h1>{d.title}</h1>
        {slug === "payment" && <PayLogos />}
        <div className="article-body"><Markdown src={d.body} /></div>
        {!["offer", "privacy", "consent"].includes(slug) && <p className="legal-date">Обновлено {LEGAL_DATE}</p>}
      </article>
    </div>
  );
}
