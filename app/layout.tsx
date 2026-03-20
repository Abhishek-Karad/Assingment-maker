import type { Metadata } from "next";
import { Inter } from 'next/font/google';
import './globals.css';
import ToasterProvider from './providers';
import { NotificationProvider } from './context/NotificationContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "VedaAI - Assignment Platform",
  description: "Create and manage assignments for your students",
  icons: {
    icon: "/logo.avif",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="font-sans antialiased" style={{ backgroundColor: '#dbdbdb' }}>
        <NotificationProvider>
          <ToasterProvider />
          {children}
        </NotificationProvider>
      </body>
    </html>
  );
}
