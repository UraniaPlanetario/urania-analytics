"""
Refresh gold.user_activities_daily a partir de bronze.kommo_events_raw
Filtra: só roles SDR + Vendas Inbound + Consultor, só leads, só outgoing messages
"""

import os
import sys
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

KOMMO_TOKEN = os.environ['KOMMO_ACCESS_TOKEN']
KOMMO_BASE = os.environ['KOMMO_BASE_URL']
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

TARGET_ROLES = {795636: 'SDR', 789160: 'Vendas Inbound', 1100256: 'Consultor'}

CATEGORY_MAP = {
    'outgoing_chat_message': 'Mensagem Enviada',
    'entity_direct_message': 'Mensagem Enviada',
    'outgoing_call': 'Ligação',
    'lead_status_changed': 'Movimentação',
    'entity_responsible_changed': 'Movimentação',
    'lead_added': 'Movimentação',
}

CATEGORY_PATTERNS = [
    ('task', 'Tarefa'),
    ('note', 'Nota'),
    ('custom_field', 'Campo alterado'),
    ('sale_field', 'Campo alterado'),
    ('entity_tag', 'Tag'),
    ('talk', 'Conversa'),
    ('call', 'Ligação'),
    ('email', 'E-mail'),
    ('entity_linked', 'Vinculação'),
]


def categorize(event_type: str) -> str:
    if event_type in CATEGORY_MAP:
        return CATEGORY_MAP[event_type]
    for pattern, cat in CATEGORY_PATTERNS:
        if pattern in event_type:
            return cat
    return 'Outros'


def sync_users_with_roles():
    """Sincroniza usuarios com role_id e role_name."""
    print('[1] Sincronizando usuarios com roles...')
    headers = {'Authorization': f'Bearer {KOMMO_TOKEN}'}
    r = requests.get(f'{KOMMO_BASE}/api/v4/users', headers=headers, params={'limit': 250})
    r.raise_for_status()
    users = r.json().get('_embedded', {}).get('users', [])

    records = []
    target_user_ids = set()
    for u in users:
        role_id = (u.get('rights') or {}).get('role_id')
        role_name = TARGET_ROLES.get(role_id)
        group_id = (u.get('rights') or {}).get('group_id')
        records.append({
            'id': u['id'],
            'name': u.get('name'),
            'email': u.get('email'),
            'role': 'admin' if (u.get('rights') or {}).get('is_admin') else 'user',
            'role_id': role_id,
            'role_name': role_name,
            'group_id': group_id,
            'synced_at': datetime.now(timezone.utc).isoformat(),
        })
        if role_id in TARGET_ROLES:
            target_user_ids.add(u['id'])

    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/kommo_users?on_conflict=id',
        headers={
            'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}',
            'Content-Type': 'application/json', 'Content-Profile': 'bronze',
            'Prefer': 'resolution=merge-duplicates',
        },
        json=records,
    )
    if r.status_code not in (200, 201):
        print(f'  Erro users: {r.status_code} {r.text[:200]}')
        sys.exit(1)

    print(f'  {len(records)} usuarios sincronizados, {len(target_user_ids)} nos roles alvo')
    return target_user_ids


def refresh_gold(target_user_ids: set):
    """Rebuild gold.user_activities_daily via SQL."""
    print('[2] Rebuilding gold.user_activities_daily...')

    user_ids_str = ','.join(str(uid) for uid in target_user_ids)

    # Usamos SQL via RPC pra fazer o rebuild direto no banco
    # Primeiro truncar, depois inserir agregado
    sql = f"""
    TRUNCATE gold.user_activities_daily;

    INSERT INTO gold.user_activities_daily
      (user_id, user_name, role_name, activity_date, activity_hour, event_type, category, entity_type, activity_count)
    SELECT
      e.created_by,
      u.name,
      u.role_name,
      DATE(e.created_at AT TIME ZONE 'America/Sao_Paulo'),
      EXTRACT(HOUR FROM e.created_at AT TIME ZONE 'America/Sao_Paulo')::int,
      e.type,
      CASE
        WHEN e.type IN ('outgoing_chat_message', 'entity_direct_message') THEN 'Mensagem Enviada'
        WHEN e.type LIKE 'task%' THEN 'Tarefa'
        WHEN e.type LIKE '%note%' THEN 'Nota'
        WHEN e.type IN ('lead_status_changed', 'entity_responsible_changed', 'lead_added') THEN 'Movimentacao'
        WHEN e.type LIKE 'custom_field%' OR e.type = 'sale_field_changed' THEN 'Campo alterado'
        WHEN e.type LIKE 'entity_tag%' THEN 'Tag'
        WHEN e.type LIKE 'talk%' THEN 'Conversa'
        WHEN e.type LIKE '%call%' THEN 'Ligacao'
        WHEN e.type LIKE '%email%' THEN 'E-mail'
        WHEN e.type LIKE 'entity_linked%' THEN 'Vinculacao'
        ELSE 'Outros'
      END,
      e.entity_type,
      COUNT(*)
    FROM bronze.kommo_events_raw e
    JOIN bronze.kommo_users u ON u.id = e.created_by
    WHERE e.created_by IN ({user_ids_str})
      AND e.entity_type = 'lead'
      AND e.type NOT IN ('incoming_chat_message')
    GROUP BY e.created_by, u.name, u.role_name,
             DATE(e.created_at AT TIME ZONE 'America/Sao_Paulo'),
             EXTRACT(HOUR FROM e.created_at AT TIME ZONE 'America/Sao_Paulo'),
             e.type, e.entity_type;
    """

    # Executar via Supabase RPC não funciona pra multi-statement.
    # Vou fazer via requests direto. Alternativa: criar uma function no PG.
    # Por agora, vou usar a abordagem de chamar delete + insert via REST.

    # Approach: DELETE all, then INSERT via SQL function
    # Melhor: criar uma stored procedure no Supabase e chamar via RPC.
    print('  (precisa rodar o SQL no Supabase - gerando arquivo)')

    sql_file = os.path.join(os.path.dirname(__file__), '..', 'supabase', 'refresh_gold_activities.sql')
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.write(sql)
    print(f'  SQL salvo em: supabase/refresh_gold_activities.sql')
    print('  Execute no SQL Editor do Supabase ou via stored procedure.')


def main():
    target_user_ids = sync_users_with_roles()
    refresh_gold(target_user_ids)
    print('\n=== Done ===')


if __name__ == '__main__':
    main()
