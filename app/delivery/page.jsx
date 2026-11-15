import LegalPage, { legalMetadata } from "@/components/LegalPage";

export const revalidate = 300;
export const generateMetadata = () => legalMetadata("delivery");
export default function Page() { return <LegalPage slug="delivery" />; }
