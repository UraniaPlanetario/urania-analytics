import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { hasAccess } from '@/lib/permissions';
import AccessDenied from '@/pages/AccessDenied';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { data: profile, isLoading } = useUserProfile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  const roles = profile?.roles ?? [];
  if (!hasAccess(roles, location.pathname)) {
    return <AccessDenied />;
  }

  return <>{children}</>;
}
