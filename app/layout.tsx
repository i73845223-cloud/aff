import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { SessionProvider } from 'next-auth/react'
import { auth } from '@/auth'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'alt.win',
    template: '%s | alt.win'
  },
  description: 'Your Alternative Way of Winning',
  icons: {
    icon: [
      { url: 'https://wmbkedgxpkgrfet3.public.blob.vercel-storage.com/logo.svg', type: 'image/svg+xml' },
      { url: 'https://wmbkedgxpkgrfet3.public.blob.vercel-storage.com/logo.svg', sizes: 'any' }
    ],
    shortcut: 'https://wmbkedgxpkgrfet3.public.blob.vercel-storage.com/logo.svg',
    apple: 'https://wmbkedgxpkgrfet3.public.blob.vercel-storage.com/logo.svg',
  },
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  return (
    <SessionProvider session={session}>
      <html lang="en" className='touch-manipulation'>
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            <Toaster />
            {children}
          </ThemeProvider>
        </body>
      </html>
    </SessionProvider>
  )
}
