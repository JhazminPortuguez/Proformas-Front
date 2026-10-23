'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { logout, me, type AuthUser } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    me()
      .then(setUser)
      .catch(() => router.push('/login'));
  }, [router]);

  async function onLogout() {
    await logout().catch(() => null);
    router.push('/login');
  }

  if (!user) return <main className="p-8">Cargando…</main>;

  return (
    <main className="p-8 space-y-4">
      <h1 className="text-xl font-semibold">Hola, {user.name}</h1>
      <p className="text-sm">
        {user.email} · rol: {user.rol}
      </p>
      <button onClick={onLogout} className="rounded bg-black px-4 py-2 text-white">
        Salir
      </button>
    </main>
  );
}
