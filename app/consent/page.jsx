import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;
export const generateMetadata = () => legalMetadata("consent");
export default function Page() { return <LegalPage slug="consent" />; }
