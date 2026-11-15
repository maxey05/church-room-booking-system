import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/supabase";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");

  return (
    <section className="mx-auto max-w-md">
      <h1>Admin login</h1>
      <LoginForm />
    </section>
  );
}
