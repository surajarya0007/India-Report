import type { Metadata } from "next";
import "./globals.css";
import PageTransition from "../components/PageTransition";
import { ThemeProvider } from "../context/ThemeContext";
import { AuthProvider } from "../context/AuthContext";

export const metadata: Metadata = {
  title: "India Reports - India's Autonomous News Intelligence Platform",
  description:
    "India Reports delivers AI-synthesized news covering India, World, Business, Tech, Science, Health and more. Updated every 15 minutes with real-time intelligence.",
  keywords: "India news, AI news, autonomous news, India Reports, breaking news, world news, business news, technology news",
  authors: [{ name: "India Reports Editorial Desk" }],
  openGraph: {
    title: "India Reports - India's Autonomous News Intelligence Platform",
    description: "AI-synthesized news covering India, World, Business, Tech, Science, Health and more.",
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
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
