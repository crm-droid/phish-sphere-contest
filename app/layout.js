import './globals.css';
import Link from 'next/link';

export const metadata = {
  title: 'LLM Phish Sphere Prediction Contest',
  description:
    '6 AI language models compete to predict Phish setlists for the 9-show Las Vegas Sphere residency.',
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
