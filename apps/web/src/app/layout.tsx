import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: {
    default: "Syncploy — The Zero-DoW Serverless Framework for AWS",
    template: "%s | Syncploy",
  },
  description:
    "Build on AWS. Sleep Through the Night. The pure TypeScript serverless framework with compile-time Denial-of-Wallet immunity.",
  keywords: [
    "aws",
    "serverless",
    "denial of wallet",
    "zero dow",
    "ddos protection",
    "lambda",
    "dynamodb",
    "typescript",
    "cloudformation",
  ],
  openGraph: {
    title: "Syncploy — The Zero-DoW Serverless Framework for AWS",
    description:
      "Build on AWS. Sleep Through the Night. Stop paying the PaaS tax out of fear of AWS.",
    url: "https://www.syncploy.com",
    siteName: "Syncploy",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Syncploy — The Zero-DoW Serverless Framework for AWS",
    description:
      "Build on AWS. Sleep Through the Night. Stop paying the PaaS tax out of fear of AWS.",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('syncploy_theme');
                  var isDark = false;
                  if (t === 'dark') {
                    isDark = true;
                  } else if (t === 'light') {
                    isDark = false;
                  } else {
                    isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                  }
                  var root = document.documentElement;
                  if (isDark) {
                    root.classList.add('dark');
                    root.style.colorScheme = 'dark';
                  } else {
                    root.classList.remove('dark');
                    root.style.colorScheme = 'light';
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500/20 selection:text-indigo-600 dark:selection:text-indigo-200 transition-colors duration-200">
        <ThemeProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
