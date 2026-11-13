"use client";
import { Printer } from "lucide-react";
export default function PrintButton() {
  return <button type="button" className="button button-outline" onClick={() => window.print()}><Printer size={16} /> Распечатать или сохранить PDF</button>;
}
