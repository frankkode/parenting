import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AllWishesPage from "@/components/all-wishes";

export default async function WishesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = session.user as { id: string; role: string };
  const isAdmin = user.role === "ADMIN" || user.role === "MEDIATOR";

  return <AllWishesPage currentUserId={user.id} isAdmin={isAdmin} />;
}
