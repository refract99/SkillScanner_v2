import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground mt-2">Your recent scans will appear here.</p>
    </main>
  );
}
