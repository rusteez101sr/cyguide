export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if student has completed onboarding
  const { data: student } = await supabase
    .from("students")
    .select("onboarding_complete, name")
    .eq("user_id", user.id)
    .single();

  if (!student?.onboarding_complete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userEmail={user.email ?? ""} userName={student?.name ?? undefined} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
