import UserLayout from '@/components/layout/UserLayout';

export default function UserRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <UserLayout>{children}</UserLayout>;
}
