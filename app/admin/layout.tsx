import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AP Grader — Admin",
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
