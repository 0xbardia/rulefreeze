import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { TxProgressBanner } from "@/components/TxProgressBanner";

export const metadata = {
  title: "RuleFreeze — Rule-Version Registry & Semantic Amendment Review",
  description: "Understand when a rule clarification changes the rules on GenLayer.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main style={{ flex: 1, padding: "24px 0" }}>
          <div className="rf-container">
            <TxProgressBanner />
            {children}
          </div>
        </main>
        <Footer />
      </body>
    </html>
  );
}
