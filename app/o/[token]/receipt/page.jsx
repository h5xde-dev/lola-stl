import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { orderByToken, orderCode, getModelsAll } from "@/lib/server/repo";
import { receiptFor } from "@/lib/server/shop";
import { getCompany } from "@/lib/server/catalog";
import { companyLine } from "@/lib/content";
import { rub } from "@/lib/format";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = { title: "Чек", robots: { index: false, follow: false }, referrer: "no-referrer" };

const fmt = d => new Date(d).toLocaleString("ru-RU", { timeZone: "Europe/Moscow", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });

// Чек заказа: позиции, скидка, оплата и фискальные данные кассового чека ЮKassa.
// Открывается по той же личной ссылке, что и заказ; его можно распечатать или сохранить в PDF.
export default async function Receipt({ params }) {
  const { token } = await params;
  const o = await orderByToken(token);
  if (!o || !o.paid_at) notFound();
  const [models, company, fiscal] = await Promise.all([getModelsAll(), getCompany(), receiptFor(o)]);
  const name = id => models.find(m => m.id === id)?.name || id;
  const code = orderCode(o.id);
  return (
    <div className="inner-page receipt-page">
      <div className="receipt-actions no-print">
        <Link href={`/o/${token}`} className="text-link"><ArrowLeft size={16} /> К заказу</Link>
        <PrintButton />
      </div>
      <section className="receipt" aria-label={`Чек заказа ${code}`}>
        <header>
          <b>lola.stl</b>
          <span>{companyLine(company)}</span>
          {company.email && <span>{company.email}{company.phone ? " · " + company.phone : ""}</span>}
        </header>
        <h1>Чек заказа {code}</h1>
        <dl className="receipt-meta">
          <div><dt>Дата оплаты</dt><dd>{fmt(o.paid_at)}</dd></div>
          {o.email && <div><dt>Покупатель</dt><dd>{o.email}</dd></div>}
          <div><dt>Способ оплаты</dt><dd>{o.method || "Банковская карта / СБП"}</dd></div>
          <div><dt>Статус</dt><dd>{o.test ? "Тестовый, без оплаты" : o.status === "refunded" ? "Возврат" : "Оплачен"}</dd></div>
        </dl>
        <table className="receipt-lines">
          <thead><tr><th>Позиция</th><th>Сумма</th></tr></thead>
          <tbody>
            {o.lines.map((l, i) => (
              <tr key={i}><td>STL-модель «{name(l.id)}»{l.gift ? <small> подарок по акции</small> : l.set ? <small> в наборе</small> : null}</td><td>{rub(l.price)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            {o.discount?.amount ? <tr><td>{o.discount.label || "Скидка"}</td><td>−{rub(o.discount.amount)}</td></tr> : null}
            <tr className="total"><td>Итого</td><td>{rub(o.total)}</td></tr>
          </tfoot>
        </table>
        <p className="receipt-note">Предмет расчёта — результат интеллектуальной деятельности (право использования STL-файлов).{(process.env.YOOKASSA_VAT_CODE || "1") === "1" ? " Без НДС." : ""}</p>
        {o.test ? <p className="receipt-note"><b>Тестовый заказ</b> — оформлен тестовой оплатой без списания денег, кассового чека нет.</p> : fiscal ? (
          <dl className="receipt-meta fiscal">
            <div><dt>ФН</dt><dd>{fiscal.fn}</dd></div>
            <div><dt>ФД</dt><dd>{fiscal.fd}</dd></div>
            <div><dt>ФП</dt><dd>{fiscal.fp}</dd></div>
            {fiscal.at && <div><dt>Зарегистрирован</dt><dd>{fmt(fiscal.at)}</dd></div>}
          </dl>
        ) : <p className="receipt-note">Кассовый чек отправлен на {o.email || "ваш email"} письмом от ЮKassa.</p>}
      </section>
    </div>
  );
}
