import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GlobalSidebar } from '@/components/layout/GlobalSidebar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import QualidadeDashboard from '@/areas/comercial/qualidade/pages/Dashboard';
import Monitoramento from '@/areas/comercial/monitoramento/index';
import LeadsFechados from '@/areas/comercial/leads-fechados/index';
import Campanhas from '@/areas/comercial/campanhas/index';
import DesempenhoVendedor from '@/areas/comercial/desempenho-vendedor/index';
import DesempenhoSDR from '@/areas/comercial/desempenho-sdr/index';
import QualidadeSDR from '@/areas/comercial/qualidade-sdr/index';
import AuditoriaFunilVendas from '@/areas/comercial/auditoria-funil-vendas/index';
import Faturamento from '@/areas/financeiro/index';
import CalendarioAstronomos from '@/areas/onboarding/calendario-astronomos/index';
import MeuCalendarioAstronomo from '@/areas/individual/calendario-astronomos/index';
import MeuDesempenhoVendedor from '@/areas/individual/desempenho-vendedor/index';
import AreaPlaceholder from '@/areas/placeholder';
import Home from '@/pages/Home';
import AdminUsers from '@/pages/admin/Users';
import AdminDepartments from '@/pages/admin/Departments';
import AdminAccessControl from '@/pages/admin/AccessControl';
import AdminPlatforms from '@/pages/admin/Platforms';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { getDashboardByPath } from '@/lib/dashboards';

interface AppShellProps {
  onLogout: () => void;
}

const protectedRoutes = [
  { path: '/', element: <Home /> },
  { path: '/comercial/qualidade', element: <QualidadeDashboard /> },
  { path: '/comercial/monitoramento', element: <Monitoramento /> },
  { path: '/comercial/leads-fechados', element: <LeadsFechados /> },
  { path: '/comercial/campanhas', element: <Campanhas /> },
  { path: '/comercial/desempenho-vendedor', element: <DesempenhoVendedor /> },
  { path: '/comercial/desempenho-sdr', element: <DesempenhoSDR /> },
  { path: '/comercial/qualidade-sdr', element: <QualidadeSDR /> },
  { path: '/comercial/auditoria-funil-vendas', element: <AuditoriaFunilVendas /> },
  { path: '/marketing', element: <AreaPlaceholder title="Marketing" /> },
  { path: '/financeiro', element: <Faturamento /> },
  { path: '/onboarding', element: <AreaPlaceholder title="Onboarding" /> },
  { path: '/onboarding/calendario-astronomos', element: <CalendarioAstronomos /> },
  { path: '/individual/calendario-astronomos', element: <MeuCalendarioAstronomo /> },
  { path: '/individual/vendedor', element: <MeuDesempenhoVendedor /> },
  { path: '/tecnologia', element: <AreaPlaceholder title="Tecnologia" /> },
  { path: '/admin/usuarios', element: <AdminUsers /> },
  { path: '/admin/departamentos', element: <AdminDepartments /> },
  { path: '/admin/acessos', element: <AdminAccessControl /> },
  { path: '/admin/plataformas', element: <AdminPlatforms /> },
];

/** Rastreia rotas visitadas (exceto a própria Home) em localStorage pra mostrar em "Últimas acessadas". */
function RouteTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const { trackVisit } = useUserPreferences(user?.id);
  useEffect(() => {
    if (location.pathname === '/' || location.pathname.startsWith('/admin')) return;
    if (getDashboardByPath(location.pathname)) trackVisit(location.pathname);
  }, [location.pathname, trackVisit]);
  return null;
}

export default function AppShell({ onLogout }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <GlobalSidebar onLogout={onLogout} />
      <main className="md:ml-56 p-4 pt-16 md:p-6 md:pt-6">
        <RouteTracker />
        <Routes>
          {protectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
