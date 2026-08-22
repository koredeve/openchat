import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenChat - Advanced Chat with Any Model',
  description: 'Chat interface with full control over models, temperature, and system prompts',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground">{children}</body>
    </html>
  );
}
