import { ReactNode } from 'react';
import { useRouteAccess } from '@/hooks/useRouteAccess';
import AccessDenied from '@/pages/AccessDenied';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { canAccess, isLoading } = useRouteAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!canAccess) return <AccessDenied />;

  return <>{children}</>;
}
