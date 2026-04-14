import { createClient } from "@/lib/supabase-server";

interface DiningMenu {
  id: string;
  dining_hall: string;
  meal_period: string;
  menu_date: string;
  items: string[];
  hours: string;
}

const DINING_HALLS = ["Conversations", "Friley Windows", "UDCC"];
const MEAL_PERIODS = ["breakfast", "lunch", "dinner"];
const MEAL_COLORS: Record<string, string> = {
  breakfast: "bg-amber-100 text-amber-700",
  lunch: "bg-blue-100 text-blue-700",
  dinner: "bg-violet-100 text-violet-700",
};

const MEAL_PLAN_INFO: Record<string, { meals: string; swipes: string; flex: string }> = {
  Cyclone: { meals: "Unlimited", swipes: "Unlimited swipes", flex: "$75 CyCash" },
  Cardinal: { meals: "14/week", swipes: "14 swipes per week", flex: "$250 CyCash" },
  Gold: { meals: "10/week", swipes: "10 swipes per week", flex: "$500 CyCash" },
  None: { meals: "—", swipes: "No meal plan", flex: "—" },
};

export default async function DiningPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: student } = await supabase
    .from("students")
    .select("meal_plan, name, on_campus")
    .eq("user_id", user!.id)
    .single();

  const mealPlan = student?.meal_plan ?? "None";
  const today = new Date().toISOString().split("T")[0];

  const { data: menus } = await supabase
    .from("dining_menus")
    .select("*")
    .eq("menu_date", today)
    .order("dining_hall");

  // Group by dining hall and meal period
  const grouped: Record<string, Record<string, DiningMenu>> = {};
  for (const menu of (menus ?? [])) {
    if (!grouped[menu.dining_hall]) grouped[menu.dining_hall] = {};
    grouped[menu.dining_hall][menu.meal_period] = menu;
  }

  const now = new Date();
  const hour = now.getHours();
  const currentMeal = hour < 10 ? "breakfast" : hour < 15 ? "lunch" : "dinner";

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dining</h1>
        <p className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Meal Plan Card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Your Meal Plan</p>
            <p className="text-lg font-semibold text-gray-900">{mealPlan === "None" ? "No meal plan" : `${mealPlan} Plan`}</p>
            {mealPlan !== "None" && (
              <p className="text-xs text-gray-500 mt-0.5">{MEAL_PLAN_INFO[mealPlan]?.swipes}</p>
            )}
          </div>
          {mealPlan !== "None" && (
            <div className="text-right">
              <p className="text-xs text-gray-400 mb-1">CyCash</p>
              <p className="text-lg font-semibold text-gray-900">{MEAL_PLAN_INFO[mealPlan]?.flex}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dining Hall Cards */}
      {DINING_HALLS.map((hall) => {
        const hallMenus = grouped[hall] ?? {};
        const hasMenus = Object.keys(hallMenus).length > 0;
        const currentMenu = hallMenus[currentMeal];
        const hours = currentMenu?.hours ?? Object.values(hallMenus)[0]?.hours;

        return (
          <div key={hall} className="bg-white rounded-2xl border border-gray-100 mb-4 overflow-hidden">
            {/* Hall Header */}
            <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">{hall}</h2>
                {hours && <p className="text-xs text-gray-400 mt-0.5">Today: {hours}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                <span className="text-xs text-gray-500">Open</span>
              </div>
            </div>

            {/* Meal Periods */}
            {hasMenus ? (
              <div>
                {MEAL_PERIODS.map((period) => {
                  const menu = hallMenus[period];
                  if (!menu) return null;
                  const isCurrentPeriod = period === currentMeal;

                  return (
                    <div
                      key={period}
                      className={`px-5 py-4 border-b border-gray-50 last:border-0 ${
                        isCurrentPeriod ? "bg-red-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${MEAL_COLORS[period]}`}>
                          {period}
                        </span>
                        {isCurrentPeriod && (
                          <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">
                            Serving now
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 ml-auto">{menu.hours}</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {menu.items.map((item, i) => (
                          <span
                            key={i}
                            className="text-xs px-2.5 py-1 bg-white rounded-full border border-gray-100 text-gray-600"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-6 text-center">
                <p className="text-sm text-gray-400">Menu not available for today</p>
              </div>
            )}
          </div>
        );
      })}

      {/* Dining hours reference */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Dining Hall Hours</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-2">Conversations (MRC)</p>
            <p>Breakfast: 7:00–10:30 AM</p>
            <p>Lunch: 10:30 AM–2:30 PM</p>
            <p>Dinner: 4:30–8:00 PM</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">Friley Windows</p>
            <p>Breakfast: 7:30–11:00 AM</p>
            <p>Lunch: 11:00 AM–3:00 PM</p>
            <p>Dinner: 4:00–8:30 PM</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">UDCC</p>
            <p>Breakfast: 7:00–10:00 AM</p>
            <p>Lunch: 10:30 AM–2:00 PM</p>
            <p>Dinner: 4:30–7:30 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
