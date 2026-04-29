import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  /** Texto a copiar. Pode ser diferente do que está sendo exibido (ex: copiar
   *  só dígitos do telefone, mostrar formatado). */
  value: string;
  /** Tamanho do ícone (padrão 12). */
  size?: number;
  /** Classes extras pro botão. */
  className?: string;
  /** Tooltip personalizado (default "Copiar"). */
  title?: string;
}

/** Botão de copiar com feedback visual: ícone vira check verde por 1.5s
 *  após copiar. Usa navigator.clipboard.writeText (suportado em browsers
 *  modernos, incluindo iOS Safari). */
export function CopyButton({ value, size = 12, className, title = 'Copiar' }: Props) {
  const [copied, setCopied] = useState(false);

  const onClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback pra browsers sem clipboard API: cria input temporário
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={copied ? 'Copiado!' : title}
      aria-label={copied ? 'Copiado!' : title}
      className={`inline-flex items-center justify-center p-1 rounded hover:bg-accent transition-colors ${
        copied ? 'text-emerald-500' : 'text-muted-foreground hover:text-foreground'
      } ${className ?? ''}`}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
    </button>
  );
}
