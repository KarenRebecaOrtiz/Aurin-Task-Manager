import { redirect } from 'next/navigation';
import { auth } from '@/lib/demo/clerk-mock';
import { DEMO_MODE } from '@/lib/demo/constants';

export default async function Home() {
  if (DEMO_MODE) {
    redirect('/dashboard/tasks');
  }

  const { userId } = await auth();
  if (userId) {
    redirect('/dashboard/tasks');
  } else {
    redirect('/sign-in');
  }
}
