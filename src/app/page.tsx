// src/app/page.tsx
import { redirect } from 'next/navigation';
import { auth } from '@clerk/nextjs/server'; 

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard/tasks');
  } else {
    redirect('/sign-in');
  }
}