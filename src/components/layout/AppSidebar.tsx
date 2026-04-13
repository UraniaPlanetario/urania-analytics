import { BarChart3, Users, AlertTriangle, Clock, ShoppingCart, FileText, LogOut } from 'lucide-react';
import logoUrania from '@/assets/logo-urania.png';

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
}

const SECTIONS = [
  { id: 'qualidade', label: 'Qualidade', icon: BarChart3 },
  { id: 'vendedores', label: 'Vendedores', icon: Users },
  { id: 'diagnostico', label: 'Diagnóstico', icon: AlertTriangle },
  { id: 'contexto', label: 'Contexto', icon: Clock },
  { id: 'comercial', label: 'Comercial', icon: ShoppingCart },
  { id: 'qualitativo', label: 'Qualitativo', icon: FileText },
];

export function AppSidebar({ activeSection, onSectionChange, onLogout }: AppSidebarProps) {
  return (
    <aside className="fixed left-0 top-0 h-screen w-56 bg-sidebar border-r border-sidebar-border flex flex-col z-50">
      <div className="p-5 border-b border-sidebar-border">
        <img src={logoUrania} alt="Urânia" className="h-10" />
        <p className="text-xs text-sidebar-foreground/60 mt-1">BI Qualidade</p>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        <p className="text-[10px] font-semibold text-sidebar-foreground/40 uppercase tracking-wider px-3 mb-2">Menu</p>
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onSectionChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
              activeSection === id
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border">
        <button onClick={onLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-sidebar-foreground/50 hover:text-destructive hover:bg-sidebar-accent/50 transition-colors">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
