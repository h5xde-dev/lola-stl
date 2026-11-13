"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "./Store";
import { rub } from "@/lib/format";

export default function MockPay({ code }) {
  const router = useRouter();
  const [o, setO] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api(`/api/orders/${encodeURIComponent(code)}`).then(r => setO(r.ok ? r.data : { error: r.data.error })); }, [code]);
  const act = async action => {
    setBusy(true);
    await api("/api/pay/mock", { method: "POST", body: JSON.stringify({ order: code, action }) });
    router.replace(`/checkout/return?order=${encodeURIComponent(code)}`);
  };
  return (
    <div className="inner-page">
      <div className="paycard" style={{ margin: "40px auto" }}>
        <span className="bank">Тестовая оплата · без списания денег</span>
        <span>Заказ {code} в магазине lola.stl</span>
        {o?.error ? <span className="err">{o.error}</span> : <b className="amt">{o ? rub(o.total) : "…"}</b>}
        <span className="note">Деньги не списываются. Заказ помечается как тестовый: в аналитику не попадает, его можно удалить в админке → «Оплата».</span>
        <button type="button" className="button button-dark full" disabled={busy || !o || o.error || o.status !== "pending"} onClick={() => act("pay")}>Оплатить</button>
        <button type="button" className="button button-outline full" disabled={busy || !o || o.error} onClick={() => act("cancel")}>Отменить</button>
      </div>
    </div>
  );
}
