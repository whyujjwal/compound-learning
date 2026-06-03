import { redirect } from "next/navigation";

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  await params; // consume params per Next 15 async convention
  redirect("/");
}
