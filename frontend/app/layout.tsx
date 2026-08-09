import './globals.css';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SmartPDF AI - Student PDF Summarizer & Study Assistant',
  description: 'AI-powered PDF chunking, summarizer, practice quiz generator, revision flashcards, and RAG doubt-solving assistant.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-background text-gray-100 antialiased selection:bg-accent-purple selection:text-white">
        {children}
      </body>
    </html>
  );
}
