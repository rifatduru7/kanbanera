# Talep Otomasyon Katmanı — Plan Analiz Raporu

> Bu doküman, mevcut Kanbanera kod tabanı detaylıca incelendikten sonra hazırlanmıştır.
> Amaç: Planın eksiklerini, risklerini, minimum efor önerilerini ve en kolay implementasyon yolunu ortaya koymak.

---

## 1. PLAN EKSİKLERİ VE GÖZDEN KAÇANLAR

### 1.1. Cloudflare Workers Cron Trigger Eksikliği

**Sorun:** Plan "Worker cron görevi" ve "cron handler" diyor ama `wrangler.toml`'da hiç `[triggers]` bloğu tanımlı değil. Cloudflare Workers'da cron çalıştırmak için `wrangler.toml`'a şu eklenmeli:

```toml
[triggers]
crons = ["*/2 * * * *"]   # her 2 dakikada bir
```

Ve `index.ts`'de `export default` objesine `scheduled` handler eklenmeli:

```ts
export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    // M365 sync logic
  }
};
```

**Etki:** Bu olmadan mail sync çalışmaz. Plan bu altyapı adımını atlamış.

---

### 1.2. `activity_log.user_id` NOT NULL Kısıtı

**Sorun:** Mevcut `activity_log` tablosu `user_id TEXT NOT NULL` kısıtına sahip. Sistem tarafından (cron job ile) oluşturulan task'lar için gerçek bir kullanıcı yoktur. Plan bu detayı atlamış.

**Çözüm Önerileri (birini seçin):**
- **A)** Bir "system bot" kullanıcı oluşturun (ör. `id: 'system'`, `email: 'system@internal'`). Cron'un oluşturduğu task'larda `created_by` bu kullanıcı olsun.
- **B)** `activity_log.user_id`'yi nullable yapın (migration gerekir). Bu mevcut kodu kırar; önerilmez.
- **C)** Shared mailbox'ın admin/owner kullanıcısını `created_by` olarak kullanın. En az değişiklik gerektiren yol.

**Öneri:** Seçenek A. Hem semantik olarak doğru, hem de activity feed'de "System Bot created task" gibi anlamlı mesajlar gösterilir.

---

### 1.3. `tasks.created_by` NOT NULL Kısıtı

**Sorun:** `tasks` tablosunda `created_by TEXT NOT NULL` ve `FOREIGN KEY (created_by) REFERENCES users(id)` kısıtı var. Mail sync ile oluşturulan task'lar için kim `created_by` olacak? Plan bunu belirtmiyor.

**Çözüm:** Yukarıdaki system bot kullanıcı veya Intake projesinin owner'ı kullanılmalı. Bu kararın açıkça planlanması gerekiyor.

---

### 1.4. Intake Projesinin Otomatik Oluşturulması

**Sorun:** Plan "merkezi Intake projesine düşecek" diyor ama bu projenin nasıl oluşturulacağını tanımlamıyor. Soru: Admin UI'dan mı seçilecek? Otomatik mı oluşturulacak? İlk kurulumda yoksa ne olacak?

**Öneri:**
- Admin Intake Settings ekranında mevcut projeler arasından seçim yapılsın.
- "Henüz seçilmedi" durumunda cron sync çalışmasın ve admin'e uyarı gösterilsin.
- Opsiyonel: "Intake projesi oluştur" tek tuş ile proje + varsayılan kolonlar ("Yeni Talepler", "İnceleniyor", "Atandı", "Tamamlandı") oluşturulsun.

---

### 1.5. Rate Limiting — Capture Endpoint

**Sorun:** Mevcut rate limiting IP bazlı (`{ip}:{endpoint}:{timestamp}`) ve D1 tabanlı. Capture endpoint hem token-authenticated hem de potansiyel abuse hedefi. Plan rate limit'ten bahsetmiyor.

**Öneri:**
- Token bazlı rate limit: aynı token ile dakikada max 10 capture.
- IP bazlı rate limit: aynı IP'den dakikada max 30 capture.
- Dedupe mekanizması ek koruma sağlar ama rate limit gerekli.

---

### 1.6. Token Auth Mekanizması — Mevcut Auth Middleware ile Uyumsuzluk

**Sorun:** Mevcut `authMiddleware` JWT Bearer token bekler ve `sub` claim'den `userId` çıkarır. Capture token'lar ise opak string'ler olacak (`token_hash` ile doğrulanacak). Bu ikisi aynı `Authorization: Bearer` header'ını kullanırsa çakışma olur.

**Çözüm Önerileri:**
- **A)** Capture endpoint'te ayrı middleware yazın: Header'daki token'ı `capture_tokens` tablosundan doğrulayın. JWT middleware'den tamamen bağımsız olsun.
- **B)** Farklı header kullanın: `X-Capture-Token: <token>`. Daha açık ve karışıklık riski yok.
- **C)** URL query parameter: `?token=<token>`. Shortcut'lardan çağırmak en kolay bu yolla, iOS/Android HTTP kısayollarında header eklemek zor olabilir.

**Öneri:** Seçenek C veya B. iOS Shortcuts'ta custom header eklemek mümkün ama kullanıcı deneyimi açısından query parameter daha basit.

---

### 1.7. Concurrency / Locking — Cron Overlap

**Sorun:** Plan "concurrent run var mı?" kontrolünden bahsetmiş ama nasıl implement edileceğini belirtmemiş. Cloudflare Workers stateless; distributed lock yok.

**Çözüm:**
- `system_settings.m365_sync_lock_until` anahtarı ekleyin.
- Cron başlarken bu değeri kontrol edin. Geçerli bir lock varsa (ör. son 5 dakika içinde), skip edin.
- Sync bittiğinde lock'u temizleyin.
- Timeout mekanizması: lock 5 dakikadan eskiyse otomatik olarak stale kabul edin.

Bu basit ama etkili bir yaklaşım. D1'de `SELECT FOR UPDATE` yok ama 2-dakikalık polling interval'de race condition riski düşük.

---

### 1.8. CORS — Capture Endpoint

**Sorun:** Mevcut CORS sadece `kanban.erabulut.com`'u kabul ediyor. iOS/Android Shortcuts HTTP istekleri browser'dan gelmediği için CORS sorun olmaz, ama tarayıcıdan test etmek sorun olabilir.

**Etki:** Düşük. Shortcut'lar native HTTP client kullanır, CORS geçerli değildir. Ama geliştirme/test aşamasında dikkat edilmeli.

---

### 1.9. Mail Body Güvenliği (XSS)

**Sorun:** Mail body'leri doğrudan task description'a yazılacak. HTML mail body'leri XSS vektörü olabilir.

**Çözüm:**
- Yalnızca `bodyPreview` kullanın (zaten plain text, max 255 karakter).
- Eğer full body isteniyorsa HTML sanitize edin (ör. `DOMPurify` veya sadece `textContent` çıkarın).
- Frontend'de description render ederken zaten escape ediyorsanız sorun yok, ama bunu doğrulayın.

---

### 1.10. Microsoft Graph Token Cache

**Sorun:** Plan client credentials flow ile token alınacağını söylüyor ama token caching'den bahsetmiyor. Her cron çalışmasında yeni token almak gereksiz API çağrısı.

**Çözüm:**
- Token'ı `system_settings` tablosunda cache'leyin: `m365_access_token`, `m365_token_expires_at`.
- Süre dolmamışsa cache'den kullanın.
- Client credentials token'lar genelde 1 saat geçerli; 2 dakikalık polling'de çok fazla gereksiz auth request olur.

---

### 1.11. Env Type Genişletilmemiş

**Sorun:** `Env` interface'inde M365 secret'ları tanımlı değil. `wrangler.toml`'da secret olarak eklenen değerler `Env`'e de eklenmeli:

```ts
export interface Env {
  // ...mevcut alanlar...
  M365_CLIENT_SECRET?: string;
}
```

---

### 1.12. Webhook Incoming Endpoint ile Capture Endpoint Arasında Kod Tekrarı

**Sorun:** Plan "mevcut webhooks.ts task oluşturma mantığı yeni servis katmanına taşınacak veya delegasyon yapacak" diyor. Bu doğru bir yaklaşım ama mevcut `webhooks.ts`'in tüm task oluşturma mantığı (position hesaplama, ilk kolon bulma, vb.) inline yazılmış. Refactor yapılmazsa iki yerde aynı mantık tekrarlanır.

**Öneri:** `IntakeService.createIntakeTask()` metodu yazılsın ve hem `webhooks.ts` hem `intake.ts` route'ları bu servisi kullansın. Bu, planın zaten önerdiği şey ama rollout sırasında bunu **en başta** yapmak gerekiyor (Adım 2).

---

### 1.13. `integrations` Tablosu Provider CHECK Kısıtı

**Sorun:** Mevcut schema: `CHECK (provider IN ('slack', 'teams', 'telegram', 'webhook'))`. Eğer ileride "m365_email" provider'ı integrations tablosuna eklenecekse bu kısıt sorun olur.

**Karar:** Plan ayrı `task_sources` tablosu kullanıyor, bu doğru. Ama `integrations` tablosundaki provider listesi güncellenebilir veya intake için hiç `integrations` tablosu kullanılmayabilir. Bu ayrımın net olması gerekiyor.

---

### 1.14. Eksik: Error Notification Mekanizması

**Sorun:** Plan "admin ekranında hata durumu görünür" diyor ama admin'in ekranı açıp bakması gerekiyor. Kritik sync hatalarında admin'e proaktif bildirim yapılmalı.

**Öneri:**
- Ardışık 3+ başarısız sync'te admin'e notification oluşturun (`notifications` tablosunu kullanarak, `type: 'system'`).
- Opsiyonel: e-mail ile bildirim.

---

### 1.15. Eksik: Capture Endpoint Response

**Sorun:** Plan capture endpoint'in response'unu tanımlamamış. iOS/Android shortcut'lar response'a göre kullanıcıya başarı/hata mesajı gösterebilir.

**Öneri:**
```json
// Başarılı
{ "success": true, "task_id": "...", "title": "..." }

// Hatalı
{ "success": false, "error": "Invalid token" }
```

---

## 2. MİNİMUM EFOR İÇİN EK ÖNERİLER

### 2.1. E-mail Reply ile Task Güncelleme

Kullanıcı Intake task'ına yorum eklemek istediğinde mail'e reply yapabilir. Bu V1'de çok zor ama şu hazırlık yapılabilir:
- `task_sources.conversation_id` zaten var. Gelecekte gelen reply'lar bu conversation_id ile eşleştirilebilir.
- V1'de bu out of scope ama veri modeli zaten hazır.

### 2.2. Telegram Bot Quick Capture

Plan WhatsApp için manual shortcut diyor. Telegram için zaten webhook altyapısı var. Telegram bot üzerinden de quick capture yapılabilir:
- Kullanıcı bota mesaj atar → bot webhook ile Kanbanera'ya POST eder → Intake task oluşur.
- Mevcut integration altyapısı buna neredeyse hazır. Sadece incoming webhook handler'a "Telegram" formatı desteği eklemek yeterli.

**Efor:** Çok düşük. Mevcut altyapı üzerine 1-2 saat ek çalışma.

### 2.3. Browser Extension / Bookmarklet

iOS/Android shortcut yerine veya yanı sıra basit bir bookmarklet verilebilir:
```javascript
javascript:void(fetch('https://api.../api/intake/capture?token=XXX',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:window.getSelection().toString(),source:'manual_capture'})}))
```
Bu, masaüstünde WhatsApp Web'den veya herhangi bir web sayfasından seçili metni tek tıkla Kanban'a göndermeyi sağlar.

### 2.4. Intake Task'ta "Kabul Et / Reddet" Quick Actions

Intake projesine düşen task'larda iki buton:
- **Kabul Et:** Proje seçme modal'ı açar, task'ı seçilen projeye taşır.
- **Reddet:** Task'ı kapatır veya "Reddedildi" kolonuna taşır.

Bu, triage sürecini hızlandırır. Mevcut `PUT /api/tasks/:id/move` endpoint'i zaten projeler arası taşımayı destekliyor mu kontrol etmek lazım — **hayır, desteklemiyor**. Mevcut move endpoint sadece `column_id` ve `position` alıyor, `project_id` değiştirmiyor. Bu yeni bir endpoint veya mevcut endpoint'in genişletilmesini gerektirir.

### 2.5. Shared Mailbox'a Gelen Mail'e Otomatik Reply

Mail alındığında otomatik bir reply gönderilebilir:
```
Talebiniz alınmıştır. Takip numarası: TASK-{id}
Durumu şu linkten izleyebilirsiniz: {link}
```

Bu, talep sahibine geri bildirim verir ve "mail gitti mi acaba" belirsizliğini ortadan kaldırır. Microsoft Graph `sendMail` API'si ile yapılabilir.

### 2.6. Duplike Detection İyileştirmesi

WhatsApp capture'da sadece `sha256(user_id + text + minute_bucket)` kullanılıyor. Aynı metin 2 dakika sonra tekrar gönderilirse yeni task açılır. Daha iyi bir yaklaşım:
- Son 10 dakika içinde aynı kullanıcının aynı metni gönderip göndermediğini kontrol edin.
- Veya `sha256(user_id + normalized_text)` kullanıp son 10 dakikadaki hash'lerle karşılaştırın.

### 2.7. Intake Dashboard Widget

Ana dashboard'a küçük bir "Bekleyen Talepler" widget'ı eklenebilir:
- Intake projesindeki ilk kolondaki task sayısı
- Son 24 saatte gelen talep sayısı
- Ortalama triage süresi

---

## 3. RİSKLER VE MİTİGASYON

### 3.1. KRİTİK: Microsoft Graph API Throttling

**Risk:** Microsoft Graph API'nin [throttling limitleri](https://learn.microsoft.com/en-us/graph/throttling) var. Mail API'leri için genellikle 10.000 request/10 dakika. 2 dakikalık polling ile bu sorun olmaz ama delta sync'te büyük batch'ler gelirse `@odata.nextLink` zinciri çok request yapabilir.

**Mitigasyon:**
- Response header'lardaki `Retry-After` değerini kontrol edin.
- 429 response'ta exponential backoff uygulayın.
- `$top=50` parametresi ile sayfa başına mesaj sayısını sınırlayın.
- Sync sırasında toplam request sayısını logla.

### 3.2. KRİTİK: M365_CLIENT_SECRET Yönetimi

**Risk:** Client secret'ın sızması tüm shared mailbox'a okuma erişimi verir. Hatta app permission ile **tüm mailbox'lara** erişim olabilir.

**Mitigasyon:**
- Cloudflare Worker secret olarak yönetin (plan bunu söylüyor, doğru).
- **Application access policy** ile sadece shared mailbox'a erişimi kısıtlayın. Plan bu referansı vermiş, mutlaka uygulayın.
- Secret rotation planı yapın (ör. 6 ayda bir).
- Entra ID'de conditional access policy ekleyin.

### 3.3. YÜKSEK: Cron Job Failure Sessiz Kalabilir

**Risk:** Cloudflare Workers scheduled handler'lar hata verdiğinde retry mekanizması sınırlı. Hata sessizce yutulabilir.

**Mitigasyon:**
- Her cron çalışmasında `m365_last_sync_at` ve `m365_last_sync_status` güncelleyin.
- Son başarılı sync 10 dakikadan eskiyse admin'e notification gönderin.
- Cloudflare dashboard'dan cron execution loglarını izleyin.
- `ctx.waitUntil()` içinde hataları yakalayın ve status tablosuna yazın.

### 3.4. YÜKSEK: Delta Link Bozulması

**Risk:** Microsoft Graph delta link'leri expire olabilir (genelde 30 gün, ama garanti değil). Expire olduğunda `410 Gone` response döner.

**Mitigasyon:**
- `410 Gone` response'ta delta link'i sıfırlayın ve full sync yapın.
- Full sync'te sadece son 7 günün maillerini çekin (`$filter=receivedDateTime ge ...`).
- Bu senaryoyu test edin ve logla.

### 3.5. ORTA: D1 Write Limitleri

**Risk:** Cloudflare D1'in [write limitleri](https://developers.cloudflare.com/d1/platform/limits/) var. Free plan'da günlük 100K row write. Çok fazla mail gelirse ve her biri task + task_source + activity_log = 3 write ise, günde ~33K mail ile limite ulaşılır.

**Mitigasyon:**
- Batch insert kullanın (D1 `batch()` API'si).
- Gerçekçi hacmi tahmin edin; çoğu şirket için günlük 100 mail bile yüksek.
- Workers Paid plan'da limitler çok daha yüksek.

### 3.6. ORTA: Capture Token Güvenliği

**Risk:** Capture token'lar long-lived ve opak. Token sızarsa herkes o kullanıcı adına task oluşturabilir.

**Mitigasyon:**
- Token'ları hash'leyerek saklayın (plan bunu söylüyor, doğru).
- `last_used_at` ile usage tracking yapın.
- Kullanıcıya "son kullanım" bilgisini gösterin.
- Anormal kullanım algılaması (ör. 1 saatte 100+ capture).
- Token'a opsiyonel TTL ekleyin (ör. 90 gün).

### 3.7. ORTA: Intake Projesi Doluluk / Performans

**Risk:** Tüm talepler tek projeye düşecek. Zamanla bu projede yüzlerce/binlerce task birikebilir. Mevcut `GET /api/projects/:id` tüm task'ları yükler.

**Mitigasyon:**
- Triage edilen task'ları gerçek projeye taşıyın (plan bunu söylüyor).
- Otomatik arşivleme: 30 günden eski, hâlâ ilk kolondaki task'ları uyar veya arşivle.
- Task listesine pagination ekleyin (mevcut sistemde board view pagination yok).

### 3.8. DÜŞÜK: WhatsApp Manual Capture UX

**Risk:** iOS Shortcuts / Android HTTP Shortcuts kurulumu teknik olmayan kullanıcılar için karmaşık olabilir.

**Mitigasyon:**
- Adım adım görsel kurulum talimatı verin (screenshots ile).
- iOS için `.shortcut` dosyası hazırlayıp indirme linki verin.
- Android için HTTP Shortcuts app config export'u sağlayın.
- QR kod ile token'ı telefona aktarmayı düşünün.

### 3.9. DÜŞÜK: Timezone Sorunları

**Risk:** Microsoft Graph `receivedDateTime` UTC döner. Frontend'de gösterilirken kullanıcının timezone'una çevrilmeli. Mevcut sistemde task `created_at` zaten UTC.

**Mitigasyon:** Frontend zaten `datetime('now')` ile UTC kullanıyor. Tutarlı olduğu sürece sorun yok.

---

## 4. EN KOLAY İMPLEMENTASYON YOLU

### Faz 0: Temel Altyapı (Önkoşul)
> Tahmini karmaşıklık: Düşük

1. **System bot kullanıcı oluşturun**
   - Migration: `INSERT INTO users (id, email, password_hash, full_name, role) VALUES ('system', 'system@internal', 'nologin', 'System Bot', 'member')`
   - Bu kullanıcı ile giriş yapılamaz (password_hash geçersiz).

2. **DB Migration'ları çalıştırın**
   - `task_sources` tablosu
   - `capture_tokens` tablosu
   - M365 system_settings anahtarları
   - `m365_sync_lock_until` anahtarı

3. **`Env` interface'ini genişletin**
   ```ts
   M365_CLIENT_SECRET?: string;
   ```

### Faz 1: Quick Capture (En Hızlı Değer)
> Tahmini karmaşıklık: Düşük-Orta
> **Neden önce bu?** M365 entegrasyonu Entra ID admin consent, shared mailbox kurulumu, Graph API testi gibi dış bağımlılıklar gerektirir. Quick capture ise sıfır dış bağımlılık ile hemen çalışır.

1. **`IntakeService.ts` oluşturun**
   ```
   backend/src/services/intake/IntakeService.ts
   ```
   - `createIntakeTask(params)` → task oluştur + `task_sources` kaydı + activity log
   - Mevcut `webhooks.ts`'teki task oluşturma mantığını buraya taşıyın
   - `webhooks.ts`'i `IntakeService` kullanacak şekilde refactor edin

2. **`CaptureTokenService.ts` oluşturun**
   ```
   backend/src/services/intake/CaptureTokenService.ts
   ```
   - `generateToken(userId, name)` → random token üret, hash'le, kaydet, plain token'ı döndür
   - `validateToken(plainToken)` → hash'le, DB'den bul, revoked/valid kontrol et, `last_used_at` güncelle
   - `revokeToken(tokenId, userId)` → `revoked_at` set et
   - `listTokens(userId)` → kullanıcının token'ları (hash gösterilmez)

3. **Capture route'u ekleyin**
   ```
   backend/src/routes/intake.ts
   ```
   - `POST /api/intake/capture` — token doğrula, IntakeService ile task oluştur
   - Auth: query param `?token=X` veya header `X-Capture-Token: X`
   - Rate limit ekleyin

4. **User token endpoint'leri ekleyin**
   ```
   backend/src/routes/users.ts'e ekleyin
   ```
   - `POST /api/users/me/capture-tokens`
   - `DELETE /api/users/me/capture-tokens/:id`
   - `GET /api/users/me/capture-tokens`

5. **Frontend: Quick Capture Settings**
   - Profile sayfasına "Quick Capture" bölümü ekleyin
   - Token üret/iptal et/listele
   - Shortcut kurulum talimatları (metin olarak)

6. **Test:** cURL ile capture endpoint'i test edin.

### Faz 2: M365 Mail Ingestion
> Tahmini karmaşıklık: Orta-Yüksek

1. **Admin Intake Settings UI**
   - Admin sayfasına yeni tab/bölüm: "Mail Intake"
   - Form: Tenant ID, Client ID, Shared Mailbox Address, Intake Project, Intake Column, Enabled toggle
   - "Secret configured" durumu göster (ama secret'ı gösterme)
   - Save butonu → system_settings'e yaz
   - `ALLOWED_SETTING_KEYS` set'ine M365 anahtarlarını ekleyin

2. **Graph Auth Service**
   ```
   backend/src/services/m365/GraphAuthService.ts
   ```
   - Client credentials flow: `POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token`
   - Token cache: `system_settings.m365_access_token`, `m365_token_expires_at`
   - Scope: `https://graph.microsoft.com/.default`

3. **Graph Mail Client**
   ```
   backend/src/services/m365/GraphMailClient.ts
   ```
   - `deltaSync()`:
     - `m365_mail_delta_link` varsa onu kullan, yoksa initial sync
     - `GET /users/{mailbox}/mailFolders/inbox/messages/delta?$select=id,internetMessageId,...&$top=50`
     - `@odata.nextLink` zincirini takip et
     - Son `@odata.deltaLink`'i kaydet
     - 410 Gone → delta link sıfırla, son 7 gün filtresiyle tekrar başla
   - `testConnection()` → basit bir `GET /users/{mailbox}` çağrısı

4. **M365 Mail Ingestion Service**
   ```
   backend/src/services/intake/M365MailIngestionService.ts
   ```
   - `runSync()`:
     - Config tam mı kontrol et
     - Lock al (sync_lock_until)
     - GraphMailClient.deltaSync() çağır
     - Her yeni mail için IntakeService.createIntakeTask() çağır
     - Dedupe: `task_sources.external_id = internetMessageId`
     - Status güncelle (last_sync_at, last_sync_status, son hata)
     - Lock bırak

5. **Cron Handler**
   - `wrangler.toml`'a `[triggers]` ekle
   - `index.ts`'e `scheduled` export ekle
   - M365MailIngestionService.runSync() çağır

6. **Admin Status Endpoint'leri**
   - `POST /api/admin/intake/m365/sync` — manuel test sync
   - `GET /api/admin/intake/status` — son sync bilgisi

7. **Admin UI: Status Panel**
   - Son başarılı sync zamanı
   - Son hata mesajı
   - "Test Sync" ve "Run Sync Now" butonları

### Faz 3: UI Zenginleştirme
> Tahmini karmaşıklık: Düşük

1. **Source Badge**
   - Task kartı ve detay modal'ında source göstergesi
   - `task_sources` tablosundan source bilgisi çekilir
   - Task GET endpoint'ine source bilgisi eklenir

2. **Source Metadata Panel**
   - Task detayında "Source" bölümü
   - Gönderen, kanal, tarih, external link

3. **Intake Dashboard Widget** (opsiyonel)
   - Bekleyen talep sayısı

---

## 5. ROLLOUT SIRALAMASI (Revize)

Planın önerdiği sıralamayı aşağıdaki gibi revize ediyorum:

```
Orijinal Plan Sırası          →  Revize Sıra
─────────────────────────────────────────────
1. DB migrationlar             →  1. DB migrationlar + system bot user
2. Intake service              →  2. IntakeService + webhooks.ts refactor
3. M365 admin config           →  3. CaptureTokenService + capture endpoint
4. Cron sync                   →  4. Frontend: Quick Capture Settings
5. Admin status ekranı         →  5. ── Faz 1 teslim / test ──
6. Quick capture token         →  6. Admin Intake Settings UI
7. iOS/Android shortcut UI     →  7. GraphAuthService + GraphMailClient
8. Source badge UI              →  8. M365MailIngestionService
9. Prod smoke test             →  9. Cron handler (wrangler.toml + scheduled)
                               →  10. Admin status endpoint + UI
                               →  11. ── Faz 2 teslim / test ──
                               →  12. Source badge + metadata UI
                               →  13. ── Faz 3 teslim / test ──
```

**Neden bu sıra:**
- Quick Capture, M365'ten bağımsızdır ve sıfır dış bağımlılık gerektirir.
- Quick Capture tek başına değer sağlar (WhatsApp, browser, herhangi bir kaynaktan task açma).
- M365 setup'ı Entra ID admin consent, shared mailbox oluşturma, DNS ayarları vb. operasyonel iş gerektirir. Bu süre zarfında Quick Capture zaten kullanılabilir.
- Source badge UI en sonda çünkü fonksiyonellik olmadan UI anlamsız.

---

## 6. DOSYA DEĞİŞİKLİK HARİTASI

### Yeni Dosyalar
```
backend/src/services/intake/IntakeService.ts
backend/src/services/intake/CaptureTokenService.ts
backend/src/services/intake/M365MailIngestionService.ts
backend/src/services/m365/GraphAuthService.ts
backend/src/services/m365/GraphMailClient.ts
backend/src/routes/intake.ts
backend/migrations/YYYYMMDD_add_task_sources.sql
backend/migrations/YYYYMMDD_add_capture_tokens.sql
backend/migrations/YYYYMMDD_add_m365_system_settings.sql
backend/migrations/YYYYMMDD_add_system_bot_user.sql
frontend/src/components/settings/QuickCaptureSettings.tsx
frontend/src/components/admin/IntakeSettingsPanel.tsx
frontend/src/components/admin/IntakeStatusPanel.tsx
frontend/src/components/kanban/SourceBadge.tsx
```

### Değişecek Dosyalar
```
backend/src/index.ts                    → scheduled handler, yeni route import
backend/src/types.ts                    → Env genişletme, yeni type'lar
backend/src/routes/webhooks.ts          → IntakeService'e delege et
backend/src/routes/users.ts             → capture token endpoint'leri
backend/src/routes/admin.ts             → ALLOWED_SETTING_KEYS, intake status endpoint
backend/src/routes/tasks.ts             → task GET'e source bilgisi ekle
backend/wrangler.toml                   → [triggers] cron
backend/schema.sql                      → yeni tablolar (referans)
frontend/src/lib/api/client.ts          → yeni API fonksiyonları
frontend/src/hooks/useKanbanData.ts     → capture token hooks
frontend/src/pages/dashboard/AdminPage.tsx → intake settings tab
frontend/src/pages/dashboard/ProfilePage.tsx → quick capture bölümü
frontend/src/components/kanban/TaskModal.tsx → source bilgisi göster
```

---

## 7. OPERASYONEL CHECKLIST (Kod Dışı)

Implementasyondan önce/sırasında yapılması gereken operasyonel işler:

- [ ] **Exchange Online:** Shared mailbox oluştur (`talep@domain.com`)
- [ ] **Entra ID:** App registration oluştur
- [ ] **Entra ID:** `Mail.Read` application permission ekle ve admin consent ver
- [ ] **Entra ID:** Application access policy ile erişimi sadece shared mailbox'a kısıtla
- [ ] **Entra ID:** Client secret oluştur
- [ ] **Cloudflare:** Worker secret olarak `M365_CLIENT_SECRET` ekle
- [ ] **Kanbanera:** "Intake / Talepler" projesi oluştur (veya admin UI'dan oluşturulsun)
- [ ] **Kanbanera:** Admin Intake Settings'ten konfigürasyon yap
- [ ] **Test:** Shared mailbox'a test mail gönder, task oluştuğunu doğrula
- [ ] **iOS:** Test kullanıcısı için Shortcuts konfigürasyonu yap
- [ ] **Android:** Test kullanıcısı için HTTP Shortcuts konfigürasyonu yap
- [ ] **Monitoring:** Cloudflare dashboard'da cron execution loglarını izle
- [ ] **Güvenlik:** 1 ay sonra token kullanım raporlarını gözden geçir

---

## 8. SONUÇ

Plan genel olarak iyi düşünülmüş ve mimarisi sağlam. Temel eksiklikler:

| # | Eksiklik | Kritiklik | Çözüm Zorluğu |
|---|----------|-----------|----------------|
| 1 | Cron trigger tanımı eksik | Kritik | Kolay |
| 2 | System bot / created_by sorunu | Kritik | Kolay |
| 3 | Token auth mekanizması belirsiz | Yüksek | Kolay |
| 4 | Cron concurrency lock yok | Orta | Kolay |
| 5 | Graph token cache yok | Orta | Kolay |
| 6 | Rate limit capture endpoint | Orta | Kolay |
| 7 | Mail body XSS riski | Orta | Kolay |
| 8 | Delta link expire handling | Orta | Kolay |
| 9 | Intake proje oluşturma akışı | Orta | Kolay |
| 10 | Error notification mekanizması | Düşük | Kolay |
| 11 | Env type genişletilmemiş | Düşük | Trivial |

Hiçbiri plan-kırıcı değil. Hepsi implementasyon sırasında ele alınabilir. **Quick Capture'ı önce yaparak** en kısa sürede değer elde edilebilir; M365 entegrasyonu operasyonel hazırlıklar tamamlandıktan sonra ikinci fazda eklenebilir.
