export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import Sidebar from "./Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Check if student has completed onboarding (students table)
  let onboardingComplete = true; // default to true so missing table doesn't break anything
  let studentName: string | undefined;

  try {
    const { data: student } = await supabase
      .from("students")
      .select("onboarding_complete, name")
      .eq("user_id", user.id)
      .single();

    if (student) {
      onboardingComplete = student.onboarding_complete ?? false;
      studentName = student.name ?? undefined;
    }
    // If students table doesn't exist, the query errors → we keep onboardingComplete = true
  } catch {
    // students table doesn't exist yet, skip onboarding redirect
  }

  if (!onboardingComplete) {
    redirect("/onboarding");
  }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar userEmail={user.email ?? ""} userName={studentName} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
