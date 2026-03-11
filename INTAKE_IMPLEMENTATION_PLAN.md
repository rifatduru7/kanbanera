# Talep Otomasyon Katmani - Revize Uygulama Plani

## Ozet

Bu plan su an uygulanmayacak. Ama proje icinde referans olarak hazir tutulacak.

Temel kararlar:

- `Quick Capture` birinci faz
- `Microsoft 365 Mail Intake` ikinci faz
- `UI enrichment` ucuncu faz
- Tum intake kanallari ortak bir `IntakeService` cekirdegi kullanacak
- Gelen talepler once merkezi bir `Intake / Talepler` projesine dusecek

## Kabul Edilen Inceleme Degisiklikleri

- `wrangler.toml` icin cron trigger tanimi acikca plana dahil edildi
- `scheduled` handler ihtiyaci netlestirildi
- Sistem tarafindan olusan tasklar icin `system bot` kullanicisi secildi
- `tasks.created_by` ve `activity_log.user_id` icin `system bot` modeli kabul edildi
- Intake projesinin admin tarafindan secilmesi benimsendi
- Capture endpoint icin ayrik rate limit gereksinimi kabul edildi
- Capture auth icin JWT'den bagimsiz ayri middleware gereksinimi kabul edildi
- Cron overlap icin basit D1 lock mekanizmasi kabul edildi
- `Env` genisletmesi plana eklendi
- `webhooks.ts` icindeki task olusturma mantiginin servis katmanina alinmasi kabul edildi
- Kritik sync hatalari icin admin notification gereksinimi kabul edildi
- `410 Gone` durumunda delta reset senaryosu plana eklendi
- Faz sirasi `Quick Capture -> M365 -> UI enrichment` olarak revize edildi

## Revize Mimari

### Faz 1: Quick Capture

Amac:

- WhatsApp dahil manuel talepleri minimum eforla Intake projesine dusurmek

Akis:

1. Kullanici profile/settings ekranindan capture token uretir
2. Telefon shortcut'i veya masaustu bookmarklet secili metni sisteme gonderir
3. Backend `X-Capture-Token` ile token'i dogrular
4. `IntakeService.createIntakeTask()` ile task acilir
5. `task_sources` kaydi olusturulur
6. Task Intake projesinin secili kolonuna duser

### Faz 2: Microsoft 365 Mail Intake

Amac:

- Shared mailbox'a gelen mailleri otomatik Intake task'a cevirmek

Akis:

1. Cloudflare cron 2 dakikada bir calisir
2. Lock kontrolu yapilir
3. M365 config tam mi kontrol edilir
4. Microsoft Graph ile delta sync cekilir
5. Her yeni mail normalize edilir
6. `IntakeService.createIntakeTask()` cagirilir
7. `task_sources` icine `source_type = 'm365_email'` kaydi yazilir
8. Sync status alanlari guncellenir
9. Lock birakilir

### Faz 3: UI Zenginlestirme

Amac:

- Intake kaynaklarini kullaniciya gorunur ve yonetilebilir kilmak

Icerik:

- Source badge
- Source metadata panel
- Admin status panel
- Quick capture setup ekrani

## Public API / Interface / Type Degisiklikleri

### Yeni Backend Endpoint'leri

1. `POST /api/intake/capture`

- Header: `X-Capture-Token`
- Body:

```ts
{
  text: string;
  source?: 'whatsapp_manual' | 'manual_capture';
  customer_name?: string;
  customer_phone?: string;
  project_hint?: string;
}
```

- Response:

```ts
{ success: true; task_id: string; title: string }
```

veya

```ts
{ success: false; error: string }
```

2. `GET /api/users/me/capture-tokens`
3. `POST /api/users/me/capture-tokens`
4. `DELETE /api/users/me/capture-tokens/:id`
5. `GET /api/admin/intake/status`
6. `POST /api/admin/intake/m365/sync`

### Yeni veya Genisleyecek Type'lar

`backend/src/types.ts`

```ts
interface Env {
  M365_CLIENT_SECRET?: string;
}
```

Yeni domain tipleri:

```ts
type IntakeSourceType = 'm365_email' | 'whatsapp_manual' | 'manual_capture' | 'webhook';

interface TaskSource {
  task_id: string;
  source_type: IntakeSourceType;
  external_id: string;
  source_url?: string | null;
  sender_name?: string | null;
  sender_address?: string | null;
  sender_phone?: string | null;
  conversation_id?: string | null;
  raw_payload?: string | null;
  created_at: string;
}

interface CaptureToken {
  id: string;
  user_id: string;
  name: string;
  token_hash: string;
  last_used_at?: string | null;
  revoked_at?: string | null;
  created_at: string;
}
```

## Veri Modeli ve Migration Kararlari

### Yeni Tablolar

1. `task_sources`

- `task_id` primary key
- `(source_type, external_id)` unique index

2. `capture_tokens`

- hash'lenmis token saklama
- revoke ve audit alanlari

### Yeni System Settings

```txt
m365_enabled
m365_tenant_id
m365_client_id
m365_shared_mailbox_address
m365_intake_project_id
m365_intake_column_id
m365_mail_delta_link
m365_last_sync_at
m365_last_sync_status
m365_last_sync_error
m365_sync_lock_until
m365_sync_fail_count
```

### System Bot

Yeni migration ile giris yapilamayan `system` kullanicisi olusturulacak.

- Tum intake task'larda `created_by = 'system'`
- Activity log kayitlarinda `user_id = 'system'`

Bu karar `tasks.created_by` ve `activity_log.user_id` zorunluluklarini bozmadan semantik olarak dogru cozum verir.

## Guvenlik Kararlari

### Capture Auth

- Ayrik middleware kullanilacak
- JWT auth ile karistirilmayacak
- Header: `X-Capture-Token`
- Token veritabaninda sadece hash olarak tutulacak

### Rate Limit

Capture endpoint:

- token bazli: dakikada `10`
- IP bazli: dakikada `30`

### Mail Guvenligi

- V1'de yalnizca `bodyPreview`
- HTML body ingest yok
- `raw_payload` varsa debug amacli tutulur, son kullaniciya gosterilmez

### M365 Secret Yonetimi

- `M365_CLIENT_SECRET` sadece Worker secret olarak saklanacak
- Uygulama erisimi shared mailbox ile sinirlandirilacak

## Operasyonel Altyapi

### Cron

`backend/wrangler.toml`

```toml
[triggers]
crons = ["*/2 * * * *"]
```

### Scheduled Handler

`backend/src/index.ts`

- `fetch` yanina `scheduled` handler eklenecek
- `M365MailIngestionService.runSync()` cagirilacak

### Lock Mekanizmasi

- `m365_sync_lock_until` kontrol edilir
- lock suresi varsayilan `5 dakika`
- stale lock otomatik asilir

## Uygulama Sirasi

### Faz 1

1. `system bot` migration
2. `task_sources` ve `capture_tokens` migration
3. `IntakeService`
4. `webhooks.ts` refactor -> `IntakeService`
5. `CaptureTokenService`
6. `intake.ts` route
7. users route'larina token endpoint'leri
8. frontend quick capture settings
9. shortcut ve bookmarklet dokumantasyonu
10. Faz 1 test ve teslim

### Faz 2

1. admin intake settings UI
2. `GraphAuthService`
3. `GraphMailClient`
4. `M365MailIngestionService`
5. cron trigger ve scheduled handler
6. admin status endpoint
7. admin status UI
8. admin failure notification
9. Faz 2 test ve teslim

### Faz 3

1. task source badge
2. task source metadata panel
3. opsiyonel intake widget
4. Faz 3 test ve teslim

## Dosya Haritasi

### Yeni Dosyalar

- `backend/src/services/intake/IntakeService.ts`
- `backend/src/services/intake/CaptureTokenService.ts`
- `backend/src/services/intake/M365MailIngestionService.ts`
- `backend/src/services/m365/GraphAuthService.ts`
- `backend/src/services/m365/GraphMailClient.ts`
- `backend/src/routes/intake.ts`
- `backend/migrations/*_add_task_sources.sql`
- `backend/migrations/*_add_capture_tokens.sql`
- `backend/migrations/*_add_m365_system_settings.sql`
- `backend/migrations/*_add_system_bot_user.sql`
- `frontend/src/components/settings/QuickCaptureSettings.tsx`
- `frontend/src/components/admin/IntakeSettingsPanel.tsx`
- `frontend/src/components/admin/IntakeStatusPanel.tsx`
- `frontend/src/components/kanban/SourceBadge.tsx`

### Degisecek Dosyalar

- `backend/src/index.ts`
- `backend/src/types.ts`
- `backend/src/routes/webhooks.ts`
- `backend/src/routes/users.ts`
- `backend/src/routes/admin.ts`
- `backend/src/routes/tasks.ts`
- `backend/wrangler.toml`
- `backend/schema.sql`
- `frontend/src/lib/api/client.ts`
- `frontend/src/hooks/useKanbanData.ts`
- `frontend/src/pages/dashboard/AdminPage.tsx`
- `frontend/src/pages/dashboard/ProfilePage.tsx`
- `frontend/src/components/kanban/TaskModal.tsx`

## Test Senaryolari

### Faz 1

1. Capture token uretme, listeleme ve revoke
2. Gecerli token ile quick capture -> task olusur
3. Gecersiz token -> kontrollu hata
4. Rate limit asimi -> kontrollu blok
5. Ayni payload kisa surede tekrar gonderildiginde dedupe davranisi dogrulanir
6. `webhooks.ts` hala task acabiliyor mu kontrol edilir

### Faz 2

1. M365 config eksik -> sync baslamaz, status `failed`
2. Shared mailbox test connection basarili
3. Yeni mail -> Intake task olusur
4. Ayni `internetMessageId` tekrar task acmaz
5. `410 Gone` durumunda delta reset ve son 7 gun fallback calisir
6. 3 ardisik hata sonrasi admin notification olusur
7. cron overlap durumunda ikinci run skip edilir

### Faz 3

1. Task detayinda source badge gorunur
2. Source metadata dogru gelir
3. External link varsa acilir
4. Sender bilgileri dogru render edilir

## Harici Bagimlilik ve Operasyon Notlari

- Exchange Online shared mailbox destegi:
  - https://learn.microsoft.com/en-us/exchange/collaboration-exo/shared-mailboxes
- Microsoft Graph messages list:
  - https://learn.microsoft.com/en-us/graph/api/user-list-messages?view=graph-rest-1.0
- Microsoft Graph delta query for messages:
  - https://learn.microsoft.com/en-us/graph/delta-query-messages
- Outlook change notifications overview:
  - https://learn.microsoft.com/en-us/graph/outlook-change-notifications-overview
- Graph throttling:
  - https://learn.microsoft.com/en-us/graph/throttling
- Mailbox access restriction:
  - https://learn.microsoft.com/en-us/graph/auth-limit-mailbox-access

## Varsayimlar

1. Tenant admin, Entra app registration ve admin consent verebiliyor
2. Shared mailbox sirket icinde acilabiliyor
3. V1'de WhatsApp yalnizca manual quick capture ile desteklenecek
4. V1'de intake merkezi tek projede toplanacak
5. V1'de cross-project otomatik routing yok
6. V1'de full HTML body veya attachment import yok
7. Capture token header modeli iOS ve Android shortcut kurulumunda kabul edilebilir UX duzeyinde kalacak

