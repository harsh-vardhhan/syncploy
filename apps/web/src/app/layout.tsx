import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.syncploy.com"),
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
  authors: [{ name: "Syncploy Team", url: "https://www.syncploy.com" }],
  creator: "Syncploy",
  publisher: "Syncploy",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Syncploy — The Zero-DoW Serverless Framework for AWS",
    description:
      "Build on AWS. Sleep Through the Night. The pure TypeScript serverless framework with compile-time Denial-of-Wallet immunity.",
    url: "https://www.syncploy.com",
    siteName: "Syncploy",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "Syncploy — The Zero-DoW Serverless Framework for AWS",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Syncploy — The Zero-DoW Serverless Framework for AWS",
    description:
      "Build on AWS. Sleep Through the Night. The pure TypeScript serverless framework with compile-time Denial-of-Wallet immunity.",
    images: ["/og-image.png"],
    creator: "@syncploy",
    site: "@syncploy",
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
                  // Purge legacy key to ensure fresh visits and reloads default to system
                  if (localStorage.getItem('syncploy_theme')) {
                    localStorage.removeItem('syncploy_theme');
                  }
                  var t = localStorage.getItem('syncploy_theme_preference');
                  var isDark = false;
                  if (t === 'dark') {
                    isDark = true;
                  } else if (t === 'light') {
                    isDark = false;
                  } else {
                    // Default on page load is ALWAYS SYSTEM (tracks OS appearance)
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
