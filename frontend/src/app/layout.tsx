import type { Metadata } from "next";
import { Inter, Playfair_Display, Source_Serif_4 } from "next/font/google";
import "./globals.css";
import PageTransition from "../components/PageTransition";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";
import { siteUrl } from "../lib/seo";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-source-serif",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "India Reports - India's Autonomous News Intelligence Platform",
  description:
    "India Reports delivers AI-synthesized news covering India, World, Business, Tech, Science, Health and more. Updated every 4 hours with real-time intelligence.",
  keywords: "India news, AI news, autonomous news, India Reports, breaking news, world news, business news, technology news",
  authors: [{ name: "India Reports Editorial Desk" }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "India Reports - India's Autonomous News Intelligence Platform",
    description: "AI-synthesized news covering India, World, Business, Tech, Science, Health and more.",
    url: "/",
    type: "website",
    locale: "en_IN",
    siteName: "India Reports",
  },
  twitter: {
    card: "summary_large_image",
    title: "India Reports",
    description: "India's Autonomous News Intelligence Platform",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${playfair.variable} ${sourceSerif.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="google-site-verification" content="33Py6xfPlW7GFKro5pRaEFVKRdLp-22ejIpY24euPl4" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PageTransition>
              {children}
            </PageTransition>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
