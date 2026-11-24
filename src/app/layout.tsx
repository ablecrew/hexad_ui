import type { Metadata } from 'next';
import { Gelasio, Lato, Red_Hat_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

const gelasio = Gelasio({
  subsets: ['latin'],
  weight: ['600'],
  variable: '--font-gelasio',
});

const lato = Lato({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-lato',
});

const redHatMono = Red_Hat_Mono({
  subsets: ['latin'],
  weight: ['500'],
  variable: '--font-red-hat-mono',
});

export const metadata: Metadata = {
  title: 'Hexad — Holistic Personal Progress',
  description:
      'Track Academics, Emotional clarity, Spiritual grounding, Mental focus, Physical energy, and Financial health in Ksh.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
      <html
          lang="en"
          className={`${gelasio.variable} ${lato.variable} ${redHatMono.variable}`}
      >
      <body className="font-sans bg-background text-inverse-surface antialiased">
      <AuthProvider>{children}</AuthProvider>
      </body>
      </html>
  );
}