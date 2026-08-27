import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Sidebar, Topbar } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:btn focus:btn-primary">Μετάβαση στο κύριο περιεχόμενο</a>
      <Sidebar role={user.role} />
      <div className="lg:pl-[72px] transition-[padding] duration-200">
        <Topbar user={user} />
        <main id="main-content" tabIndex={-1} className="p-4 lg:p-7 pb-24 lg:pb-10 max-w-[1680px] mx-auto outline-none">{children}</main>
      </div>
    </div>
  );
}
