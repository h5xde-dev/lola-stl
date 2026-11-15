import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;
export const generateMetadata = () => legalMetadata("payment");
export default function Page() { return <LegalPage slug="payment" />; }
