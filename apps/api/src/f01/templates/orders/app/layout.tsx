import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "../styles/globals.css";

export const metadata: Metadata = {
  title: "Quản lý đơn hàng",
  description: "Ghi đơn, theo dõi giao hàng và doanh thu theo ngày cho cửa hàng nhỏ.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
