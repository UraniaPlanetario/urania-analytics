import { useMemo } from 'react';
import { ExternalLink } from 'lucide-react';
import type { LeadAtual } from '../hooks/useFunilWhatsapp';
import { kommoLeadUrl, nomesBatem } from '../types';

interface Props {
  ativos: LeadAtual[];
}

function fmtDays(d: number | null | undefined): string {
  if (d == null) return '—';
  return d < 1 ? '<1d' : `${Math.floor(d)}d`;
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function DivergenciasBlock({ ativos }: Props) {
  // Tabela A: responsável do lead × vendedor (custom field "Vendedor/Consultor")
  const divResponsavelVendedor = useMemo(() => {
    return ativos.filter((l) => {
      if (!l.vendedor_consultor) return false; // sem vendedor preenchido = não auditável
      return !nomesBatem(l.responsible_user_name, l.vendedor_consultor);
    });
  }, [ativos]);

  // Tabela B: responsável do lead × responsável da tarefa aberta
  const divResponsavelTarefa = useMemo(() => {
    return ativos.filter((l) => {
      if (!l.tarefa_id || !l.tarefa_responsible_user_name) return false;
      return !nomesBatem(l.responsible_user_name, l.tarefa_responsible_user_name);
    });
  }, [ativos]);

  // Tabela C: tempo sem interação (mensagem enviada mais antiga)
  const tempoSemInteracao = useMemo(() => {
    return ativos
      .filter((l) => l.ultima_msg_enviada_at != null)
      .sort((a, b) => (b.dias_sem_interacao ?? 0) - (a.dias_sem_interacao ?? 0))
      .slice(0, 100);
  }, [ativos]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Divergências e Tempo sem Interação</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Match permissivo de nomes (normaliza acentos e caixa, considera divergente se um nome
          não contém o outro). Quando o campo está vazio, o lead não entra na tabela.
        </p>
      </div>

      {/* 3 KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsável ≠ Vendedor</p>
          <p className="text-3xl font-bold mt-1 text-amber-500">{divResponsavelVendedor.length}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Responsável ≠ User da tarefa</p>
          <p className="text-3xl font-bold mt-1 text-amber-500">{divResponsavelTarefa.length}</p>
        </div>
        <div className="card-glass p-4 rounded-xl">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sem interação 7+ dias</p>
          <p className="text-3xl font-bold mt-1 text-rose-500">
            {ativos.filter((l) => (l.dias_sem_interacao ?? 0) > 7).length}
          </p>
        </div>
      </div>

      {/* Tabela A: Responsável vs Vendedor */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Responsável do lead ≠ Vendedor (custom field)</p>
          <p className="text-xs text-muted-foreground mt-1">
            Compara <code className="text-xs">lead.responsible_user_name</code> com o custom field
            "Vendedor/Consultor". Útil pra detectar leads atribuídos a uma pessoa no CRM mas com
            outro nome marcado como vendedor.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável (lead)</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Vendedor (custom)</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {divResponsavelVendedor.slice(0, 100).map((l) => (
                <tr key={l.lead_id} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="py-1.5 px-3 truncate max-w-[260px]" title={l.lead_name ?? ''}>
                    {l.lead_name ?? `Lead #${l.lead_id}`}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.status_name ?? '—'}</td>
                  <td className="py-1.5 px-3">{l.responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3">{l.vendedor_consultor ?? '—'}</td>
                  <td className="py-1.5 px-3 text-right">
                    <a href={kommoLeadUrl(l.lead_id)!} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1" title="Abrir no Kommo">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {divResponsavelVendedor.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem divergências no recorte. ✅</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {divResponsavelVendedor.length > 100 && (
          <p className="px-4 py-2 text-xs text-muted-foreground border-t">
            Mostrando 100 de {divResponsavelVendedor.length} divergências.
          </p>
        )}
      </div>

      {/* Tabela B: Responsável vs Tarefa */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Responsável do lead ≠ User da tarefa aberta</p>
          <p className="text-xs text-muted-foreground mt-1">
            Compara <code className="text-xs">lead.responsible_user_name</code> com{' '}
            <code className="text-xs">task.responsible_user_name</code>. Considera só leads que têm tarefa aberta.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável (lead)</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">User (tarefa)</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {divResponsavelTarefa.slice(0, 100).map((l) => (
                <tr key={l.lead_id} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="py-1.5 px-3 truncate max-w-[260px]" title={l.lead_name ?? ''}>
                    {l.lead_name ?? `Lead #${l.lead_id}`}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.status_name ?? '—'}</td>
                  <td className="py-1.5 px-3">{l.responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3">{l.tarefa_responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-right">
                    <a href={kommoLeadUrl(l.lead_id)!} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1" title="Abrir no Kommo">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {divResponsavelTarefa.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Sem divergências no recorte. ✅</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {divResponsavelTarefa.length > 100 && (
          <p className="px-4 py-2 text-xs text-muted-foreground border-t">
            Mostrando 100 de {divResponsavelTarefa.length} divergências.
          </p>
        )}
      </div>

      {/* Tabela C: Tempo sem interação */}
      <div className="card-glass rounded-xl overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-sm font-semibold">Tempo sem interação — top 100 mais antigos</p>
          <p className="text-xs text-muted-foreground mt-1">
            Última mensagem ENVIADA pra cada lead (qualquer remetente, bot ou humano).
            Útil pra detectar leads que pararam de receber qualquer iniciativa de contato.
          </p>
        </div>
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card border-b z-10">
              <tr>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Lead</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Última msg enviada</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Responsável</th>
                <th className="text-left py-2 px-3 text-xs font-semibold text-muted-foreground">Etapa</th>
                <th className="text-right py-2 px-3 text-xs font-semibold text-muted-foreground">Sem interação há</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {tempoSemInteracao.map((l) => (
                <tr key={l.lead_id} className="border-b border-border/40 hover:bg-accent/40">
                  <td className="py-1.5 px-3 truncate max-w-[240px]" title={l.lead_name ?? ''}>
                    {l.lead_name ?? `Lead #${l.lead_id}`}
                  </td>
                  <td className="py-1.5 px-3 text-muted-foreground tabular-nums">{fmtDateTime(l.ultima_msg_enviada_at)}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.responsible_user_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-muted-foreground">{l.status_name ?? '—'}</td>
                  <td className="py-1.5 px-3 text-right tabular-nums font-medium text-rose-500">
                    {fmtDays(l.dias_sem_interacao)}
                  </td>
                  <td className="py-1.5 px-3 text-right">
                    <a href={kommoLeadUrl(l.lead_id)!} target="_blank" rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center gap-1" title="Abrir no Kommo">
                      <ExternalLink size={12} />
                    </a>
                  </td>
                </tr>
              ))}
              {tempoSemInteracao.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-muted-foreground">Sem dados de mensagens no recorte.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
