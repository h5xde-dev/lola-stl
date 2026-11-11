// Разметка schema.org для поисковиков. Символ "<" экранируется, чтобы текст из админки не закрыл тег.
export default function JsonLd({ data }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
