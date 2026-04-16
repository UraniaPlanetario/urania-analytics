"""
Sync Kommo leads → bronze.kommo_leads_raw
Snapshot completo de todos os leads com campos nativos + custom fields como JSONB.
"""

import os
import sys
import time
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

KOMMO_TOKEN = os.environ['KOMMO_ACCESS_TOKEN']
KOMMO_BASE = os.environ['KOMMO_BASE_URL']
SUPABASE_URL = os.environ['SUPABASE_URL']
SUPABASE_KEY = os.environ['SUPABASE_SERVICE_ROLE_KEY']

KOMMO_HEADERS = {'Authorization': f'Bearer {KOMMO_TOKEN}'}
SUPABASE_HEADERS = {
    'apikey': SUPABASE_KEY,
    'Authorization': f'Bearer {SUPABASE_KEY}',
    'Content-Type': 'application/json',
    'Content-Profile': 'bronze',
    'Prefer': 'resolution=merge-duplicates',
}


def fetch_users():
    resp = requests.get(f'{KOMMO_BASE}/api/v4/users', headers=KOMMO_HEADERS)
    resp.raise_for_status()
    return {u['id']: u['name'] for u in resp.json()['_embedded']['users']}


def fetch_pipelines():
    resp = requests.get(f'{KOMMO_BASE}/api/v4/leads/pipelines', headers=KOMMO_HEADERS)
    resp.raise_for_status()
    pmap = {}
    smap = {}
    for p in resp.json()['_embedded']['pipelines']:
        pmap[p['id']] = p['name']
        for s in p.get('_embedded', {}).get('statuses', []):
            smap[(p['id'], s['id'])] = s['name']
    return pmap, smap


def ts_to_iso(ts):
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()


def transform_lead(lead, users, pmap, smap):
    cfs = lead.get('custom_fields_values') or []
    cf_dict = {}
    for f in cfs:
        name = f.get('field_name', str(f['field_id']))
        vals = f.get('values', [])
        if len(vals) == 1:
            cf_dict[name] = vals[0].get('value')
        elif len(vals) > 1:
            cf_dict[name] = [v.get('value') for v in vals]

    return {
        'id': lead['id'],
        'name': lead.get('name'),
        'price': lead.get('price'),
        'responsible_user_id': lead.get('responsible_user_id'),
        'group_id': lead.get('group_id'),
        'status_id': lead.get('status_id'),
        'pipeline_id': lead.get('pipeline_id'),
        'loss_reason_id': lead.get('loss_reason_id'),
        'created_by': lead.get('created_by'),
        'updated_by': lead.get('updated_by'),
        'created_at': ts_to_iso(lead.get('created_at')),
        'updated_at': ts_to_iso(lead.get('updated_at')),
        'closed_at': ts_to_iso(lead.get('closed_at')),
        'closest_task_at': ts_to_iso(lead.get('closest_task_at')),
        'is_deleted': lead.get('is_deleted', False),
        'pipeline_name': pmap.get(lead.get('pipeline_id')),
        'status_name': smap.get((lead.get('pipeline_id'), lead.get('status_id'))),
        'responsible_user_name': users.get(lead.get('responsible_user_id')),
        'custom_fields': cf_dict if cf_dict else None,
        'synced_at': datetime.now(timezone.utc).isoformat(),
    }


def upsert_batch(records):
    seen = {}
    for r in records:
        seen[r['id']] = r
    batch = list(seen.values())

    r = requests.post(
        f'{SUPABASE_URL}/rest/v1/kommo_leads_raw?on_conflict=id',
        headers=SUPABASE_HEADERS,
        json=batch,
    )
    if r.status_code not in (200, 201):
        print(f'  Erro upsert: {r.status_code} {r.text[:200]}')
        sys.exit(1)
    return len(batch)


def main():
    print('=== Sync Kommo Leads → bronze.kommo_leads_raw ===\n')

    print('[1/3] Buscando usuarios e pipelines...')
    users = fetch_users()
    pmap, smap = fetch_pipelines()
    print(f'  {len(users)} usuarios, {len(pmap)} pipelines')

    print('[2/3] Buscando leads...')
    all_leads = []
    page = 1
    while True:
        resp = requests.get(f'{KOMMO_BASE}/api/v4/leads', headers=KOMMO_HEADERS, params={
            'limit': 250, 'page': page, 'order[updated_at]': 'desc',
        })
        if resp.status_code == 204:
            break
        resp.raise_for_status()
        leads = resp.json().get('_embedded', {}).get('leads', [])
        if not leads:
            break
        all_leads.extend(leads)
        print(f'  Pagina {page}: {len(leads)} leads (total: {len(all_leads)})', flush=True)
        if len(leads) < 250:
            break
        if page % 6 == 0:
            time.sleep(1)
        else:
            time.sleep(0.15)
        page += 1

    print(f'  Total: {len(all_leads)} leads\n')

    print('[3/3] Transformando e enviando...')
    records = [transform_lead(l, users, pmap, smap) for l in all_leads]

    upserted = 0
    batch_size = 500
    for i in range(0, len(records), batch_size):
        batch = records[i:i + batch_size]
        upserted += upsert_batch(batch)
        print(f'  {upserted}/{len(records)} enviados', flush=True)

    print(f'\n=== Concluido: {upserted} leads sincronizados ===')


if __name__ == '__main__':
    main()
