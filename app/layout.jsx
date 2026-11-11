import { Manrope, PT_Serif, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/components/Store";
import Shell from "@/components/Shell";
import { INDEXING, SITE_DESC, SITE_NAME, SITE_URL } from "@/lib/site";

const manrope = Manrope({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "600", "700"], variable: "--font-manrope", display: "swap" });
const serif = PT_Serif({ subsets: ["latin", "cyrillic"], weight: ["400", "700"], style: ["normal", "italic"], variable: "--font-serif", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "lola.stl — авторские STL-модели кашпо для 3D-печати", template: "%s | lola.stl" },
  description: SITE_DESC,
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: { type: "website", locale: "ru_RU", siteName: SITE_NAME, url: "/" },
  twitter: { card: "summary_large_image" },
  robots: INDEXING ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false },
};

export const viewport = { themeColor: "#f7f5f0", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
