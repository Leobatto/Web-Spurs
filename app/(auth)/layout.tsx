export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f3f1ec] px-5 py-10">
      {children}
    </main>
  );
}
