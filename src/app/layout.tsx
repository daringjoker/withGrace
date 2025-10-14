import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { ReduxProvider } from "@/components/ReduxProvider";
import { GroupProvider } from "@/contexts/GroupContext";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "With Grace - Monitor Your Baby's Daily Activities",
  description: "Track feeding, diaper changes, sleep, and other important baby events with photos and detailed notes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: undefined, // Use light theme by default
        variables: {
          colorPrimary: "#3b82f6", // Blue theme to match the app
          colorBackground: "#ffffff",
          colorInputBackground: "#f8fafc",
        },
        elements: {
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700 text-sm",
          card: "shadow-lg border border-gray-200",
        },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
          suppressHydrationWarning={true}
        >
          <ReduxProvider>
            <GroupProvider>
              <Layout>{children}</Layout>
            </GroupProvider>
          </ReduxProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
