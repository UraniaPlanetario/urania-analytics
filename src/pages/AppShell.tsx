import { Routes, Route, Navigate } from 'react-router-dom';
import { GlobalSidebar } from '@/components/layout/GlobalSidebar';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import QualidadeDashboard from '@/areas/comercial/qualidade/pages/Dashboard';
import Monitoramento from '@/areas/comercial/monitoramento/index';
import LeadsFechados from '@/areas/comercial/leads-fechados/index';
import Campanhas from '@/areas/comercial/campanhas/index';
import DesempenhoVendedor from '@/areas/comercial/desempenho-vendedor/index';
import DesempenhoSDR from '@/areas/comercial/desempenho-sdr/index';
import Faturamento from '@/areas/financeiro/index';
import AreaPlaceholder from '@/areas/placeholder';
import AdminUsuarios from '@/pages/AdminUsuarios';
import { useUserProfile } from '@/hooks/useUserProfile';
import { getAccessiblePaths } from '@/lib/permissions';

interface AppShellProps {
  onLogout: () => void;
}

function DefaultRedirect() {
  const { data: profile } = useUserProfile();
  const accessible = getAccessiblePaths(profile?.roles ?? []);
  // Redireciona pro primeiro dashboard acessível
  const target = accessible.find((p) => !p.startsWith('/admin')) || '/comercial/qualidade';
  return <Navigate to={target} replace />;
}

const protectedRoutes = [
  { path: '/comercial/qualidade', element: <QualidadeDashboard /> },
  { path: '/comercial/monitoramento', element: <Monitoramento /> },
  { path: '/comercial/leads-fechados', element: <LeadsFechados /> },
  { path: '/comercial/campanhas', element: <Campanhas /> },
  { path: '/comercial/desempenho-vendedor', element: <DesempenhoVendedor /> },
  { path: '/comercial/desempenho-sdr', element: <DesempenhoSDR /> },
  { path: '/marketing', element: <AreaPlaceholder title="Marketing" /> },
  { path: '/financeiro', element: <Faturamento /> },
  { path: '/onboarding', element: <AreaPlaceholder title="Onboarding" /> },
  { path: '/tecnologia', element: <AreaPlaceholder title="Tecnologia" /> },
  { path: '/admin/usuarios', element: <AdminUsuarios /> },
];

export default function AppShell({ onLogout }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <GlobalSidebar onLogout={onLogout} />
      <main className="ml-56 p-6">
        <Routes>
          {protectedRoutes.map(({ path, element }) => (
            <Route
              key={path}
              path={path}
              element={<ProtectedRoute>{element}</ProtectedRoute>}
            />
          ))}
          <Route path="*" element={<DefaultRedirect />} />
        </Routes>
      </main>
    </div>
  );
}
