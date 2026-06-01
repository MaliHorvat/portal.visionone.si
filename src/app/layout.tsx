import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "latin-ext"],
});

const display = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "VisionOne Portal",
    template: "%s | VisionOne Portal",
  },
  description: "Operativni portal VisionOne za upravljanje strank, opomnikov in servisnih nalog.",
};

const themeBootScript = `(function(){try{var k="vo-portal-theme",t=localStorage.getItem(k),dark;if(t==="light")dark=false;else if(t==="dark")dark=true;else if(t==="system")dark=window.matchMedia("(prefers-color-scheme: dark)").matches;else dark=true;if(dark)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){document.documentElement.classList.add("dark");}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="sl" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className={`${inter.variable} ${display.variable} min-h-screen antialiased`}>
        <ClerkProvider>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
