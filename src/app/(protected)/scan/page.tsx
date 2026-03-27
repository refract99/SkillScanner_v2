import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ScanPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">New Scan</h1>
      <p className="text-muted-foreground mt-2">Paste a GitHub URL to scan a skill or MCP server.</p>
    </main>
  );
}
