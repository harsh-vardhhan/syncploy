import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "Syncploy - Infrastructure-from-Code Compiler for Pure AWS Serverless",
  description:
    "Write standard TypeScript. Syncploy parses your application logic, detects recursive loops at compile-time, and synthesizes 1:1 CloudFormation templates with zero stateful replacements.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-background text-foreground antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
