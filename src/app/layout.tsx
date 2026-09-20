import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Navbar } from '@/components/common/Navbar';

export const metadata: Metadata = {
  title: 'Virtual Programming Simulation Lab (VLab)',
  description: 'Real-time interactive coding lab and instructor live monitoring platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-[#0d1117] text-gray-100 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
