import { useAuth } from '@/hooks/useAuth';
import Login from './Login';
import AppShell from './AppShell';
import { Loader2 } from 'lucide-react';

export default function Index() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!user) return <Login />;
  return <AppShell onLogout={signOut} />;
}
