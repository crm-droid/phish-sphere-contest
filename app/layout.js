import './globals.css';
import Link from 'next/link';

const SITE_URL = 'https://phish-sphere-contest.vercel.app';
const SITE_TITLE = 'LLM Phish Sphere Prediction Contest';
const SITE_DESCRIPTION =
  'Six AI models compete to predict Phish setlists for the 2026 Las Vegas Sphere residency. Who knows Phish best?';
const OG_IMAGE = `${SITE_URL}/og-image.png`;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    url: SITE_URL,
    siteName: SITE_TITLE,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'LLM Phish Sphere Prediction Contest',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [OG_IMAGE],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <nav>
          <span className="brand">Phish Sphere Contest</span>
          <Link href="/">Leaderboard</Link>
          <Link href="/weekends/1">Weekends</Link>
          <Link href="/shows/1">Shows</Link>
          <Link href="/about">About</Link>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
