import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tech Netra — Voice-First Codebase Assistant & Interactive Tutor",
  description:
    "Accessibility-first developer tool for visually impaired and blind developers featuring structural AST jumping, conversational debugging, voice code generation, and visual co-pilot.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark bg-black text-white h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-black text-white font-sans antialiased selection:bg-yellow-400 selection:text-black">
        {children}
      </body>
    </html>
  );
}
