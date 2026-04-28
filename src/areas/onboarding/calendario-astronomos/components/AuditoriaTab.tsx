import { useState, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { Agendamento } from '../types';
import { computeAuditFlags } from '../types';
import { ListaAgendamentos } from './ListaAgendamentos';
import { AgendamentoModal } from './AgendamentoModal';
import { OnboardingSemVisitaSection } from './OnboardingSemVisitaSection';
import { useOnboardingSemVisita } from '../hooks/useAgendamentos';

interface Props {
  agendamentos: Agendamento[];
}

export function AuditoriaTab({ agendamentos }: Props) {
  const { data: onboardingSemVisita = [] } = useOnboardingSemVisita();
  const [selected, setSelected] = useState<Agendamento | null>(null);

  // Auditoria só faz sentido em tarefas que ainda exigem ação — concluídas
  // ficam fora por padrão.
  const abertas = useMemo(
    () => agendamentos.filter((a) => a.status_tarefa !== 'completa'),
    [agendamentos],
  );

  // Calcula flags com contexto do lead — necessário pra regra de múltiplas
  // diárias (N visitas em sequência batendo com data_agendamento ⇒ tudo OK).
  const auditFlags = useMemo(() => computeAuditFlags(abertas), [abertas]);

  const grupos = useMemo(() => {
    const flagNome: Agendamento[] = [];
    const flagData: Agendamento[] = [];
    const flagTarefa: Agendamento[] = [];
    const semCoord: Agendamento[] = [];
    const semLead: Agendamento[] = [];
    for (const a of abertas) {
      const f = auditFlags.get(a.task_id);
      if (f?.nome) flagNome.push(a);
      if (f?.data) flagData.push(a);
      if (f?.tarefa) flagTarefa.push(a);
      if (a.latitude == null || a.longitude == null) semCoord.push(a);
      if (a.lead_id == null) semLead.push(a);
    }
    return { flagNome, flagData, flagTarefa, semCoord, semLead };
  }, [abertas, auditFlags]);

  const onbCriticos = useMemo(
    () => onboardingSemVisita.filter((l) => !l.lead_vazio && !l.ja_teve_visita_completa && l.tem_agendamento_futuro).length,
    [onboardingSemVisita],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Auditoria Nome" count={grupos.flagNome.length} />
        <SummaryCard label="Auditoria Data" count={grupos.flagData.length} />
        <SummaryCard label="Auditoria Tarefa" count={grupos.flagTarefa.length} />
        <SummaryCard label="Onboarding s/ VISITA (críticos)" count={onbCriticos} />
        <SummaryCard label="Sem coordenada" count={grupos.semCoord.length} />
        <SummaryCard label="Sem lead vinculado" count={grupos.semLead.length} />
      </div>

      <OnboardingSemVisitaSection items={onboardingSemVisita} />

      <Section
        title="Auditoria Nome — astrônomo no card do lead ≠ astrônomo da tarefa"
        description="O custom field 'Astrônomo' do lead não bate com o astrônomo derivado do task_type_id da tarefa. Indica troca de astrônomo sem refletir no card (ou vice-versa)."
        items={grupos.flagNome}
        onSelect={setSelected}
        auditFlags={auditFlags}
      />

      <Section
        title="Auditoria Data — data da tarefa ≠ data agendada do lead"
        description="A data programada da tarefa Kommo (complete_till) não coincide com a 'data de agendamento' do lead. Para leads com múltiplas diárias, se a quantidade de tarefas VISITA bate com 'Nº de Diárias' e a primeira já casa com a data agendada, as visitas seguintes são consideradas esperadas e não acendem a flag."
        items={grupos.flagData}
        onSelect={setSelected}
        auditFlags={auditFlags}
      />

      <Section
        title="Auditoria Tarefa — tipo ≠ VISITA com data agendada"
        description="Lead com data de agendamento preenchida, mas a tarefa atual no Kommo não é VISITA (nem PRÉ). Pode indicar tipo errado de tarefa após pré-visita."
        items={grupos.flagTarefa}
        onSelect={setSelected}
        auditFlags={auditFlags}
      />

      <AgendamentoModal
        open={!!selected}
        agendamento={selected}
        onClose={() => setSelected(null)}
        auditFlags={auditFlags}
      />
    </div>
  );
}

function SummaryCard({ label, count }: { label: string; count: number }) {
  const danger = count > 0;
  return (
    <div className={`bg-card border rounded-lg p-3 ${danger ? 'border-amber-500/40' : ''}`}>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1">
        {danger && <AlertTriangle size={11} className="text-amber-600" />} {label}
      </p>
      <p className={`text-xl font-semibold mt-0.5 ${danger ? 'text-amber-700' : ''}`}>{count}</p>
    </div>
  );
}

function Section({
  title, description, items, onSelect, auditFlags,
}: {
  title: string;
  description: string;
  items: Agendamento[];
  onSelect: (a: Agendamento) => void;
  auditFlags: ReturnType<typeof computeAuditFlags>;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold flex items-center gap-2">
        <AlertTriangle size={14} className="text-amber-600" /> {title}
        <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
      </h3>
      <p className="text-xs text-muted-foreground mt-0.5 mb-2">{description}</p>
      <ListaAgendamentos
        agendamentos={items}
        onSelect={onSelect}
        showAuditoriaFlags
        emptyLabel="Nada a auditar — tudo ok aqui."
        auditFlags={auditFlags}
      />
    </div>
  );
}
