import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;
export const generateMetadata = () => legalMetadata("privacy");
export default function Page() { return <LegalPage slug="privacy" />; }
