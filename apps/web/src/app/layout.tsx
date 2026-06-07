import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'AI DevOps Platform | Intelligent Pipeline Orchestration',
  description: 'AI-powered DevOps platform — automated code review, risk analysis, deployment, and anomaly detection in one unified dashboard.',
  keywords: ['DevOps', 'AI', 'CI/CD', 'Pipeline', 'Code Review', 'Kubernetes', 'Docker'],
  authors: [{ name: 'AI DevOps Platform' }],
  openGraph: {
    title: 'AI DevOps Platform',
    description: 'Intelligent pipeline orchestration powered by AI',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
