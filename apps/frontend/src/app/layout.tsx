import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const jbmono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PULSE — Self-Aware Stadium",
  description:
    "Multi-agent AI ops console for M. Chinnaswamy Stadium on IPL final day.",
};

/** Root HTML layout for the ops console; applies global fonts and CSS. */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jbmono.variable}`}>
      <body>
        {/* Skip-nav link — first tab stop for keyboard / screen-reader users. */}
        <a href="#main" className="skip-nav">
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
