import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import logoUrania from '@/assets/logo-urania.png';

export default function Login() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
    } catch (err: any) {
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm card-glass p-8">
        <div className="text-center mb-8">
          <img src={logoUrania} alt="Urânia" className="h-16 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">BI Qualidade</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          <input type="password" placeholder="Senha" value={password} onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" required />
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
          <button type="submit" className="w-full py-2 rounded-lg gradient-primary text-white font-medium disabled:opacity-50" disabled={loading}>
            {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
