export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // If already onboarded, go to dashboard
  const { data: student } = await supabase
    .from("students")
    .select("onboarding_complete")
    .eq("user_id", user.id)
    .single();

  if (student?.onboarding_complete) redirect("/dashboard");

  return <>{children}</>;
}
