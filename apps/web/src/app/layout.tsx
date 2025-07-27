import './global.css';

export const metadata = {
  title: 'MANO: My Own Note (개발중)',
  description: '서비스 준비중',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
