import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CreateCaseForm } from "./create-case-form";

export default async function CreateCasePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; name?: string; role: string };

  // Only admin and mediator can create cases
  if (user.role !== "ADMIN" && user.role !== "MEDIATOR") {
    redirect("/dashboard");
  }

  // Fetch available parents and mediators
  const [parents, mediators] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PARENT" },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: {
        OR: [{ role: "MEDIATOR" }, { role: "ADMIN" }],
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create New Case</h1>
        <p className="text-gray-500 mt-1">
          Set up a new family case with parents, children, and a mediator.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <CreateCaseForm
          parents={parents}
          mediators={mediators}
          isAdmin={true}
          currentUserId={user.id}
          currentUserRole={user.role}
        />
      </div>
    </div>
  );
}
