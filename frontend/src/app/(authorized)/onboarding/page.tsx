import prisma from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


export default async function OnboardingPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
  });

  if (!existing) {
    await prisma.user.create({
      data: {
        id: user.id,
        email: user!.emailAddresses[0]!.emailAddress
      },
    });
  }

  redirect("/");
}
