# ERA Kanban — Production Readiness Audit & Improvement Plan

Tüm backend route'ları, middleware'ler, DB şeması, frontend sayfa/component/hook/store/type dosyaları tek tek incelendi. Bulgular aşağıda **Kritiklik** sırasına göre gruplandırılmıştır.

---

## 🔴 Kritik Hatalar & Güvenlik Açıkları

### 1. Parola Hashleme: SHA-256 → bcrypt/scrypt
**Dosya:** [auth.ts](file:///d:/kanbanera/kanbanera/backend/src/middleware/auth.ts#L142-L148)

SHA-256 tek geçişli bir hash fonksiyonudur; brute-force saldırılarına karşı dayanıksızdır. Production ortamında **mutlaka** `bcryptjs` veya Cloudflare Workers'ın desteklediği iteratif bir hash kullanılmalıdır.

### 2. Auth `/me` Endpoint Bug'ı
**Dosya:** [auth.ts](file:///d:/kanbanera/kanbanera/backend/src/routes/auth.ts#L239-L277)

`/api/auth/me` endpoint'i `Authorization` header'ı kontrol etmesine rağmen, kullanıcı kimliğini **refresh token** (cookie) üzerinden alıyor. Access token ile çalışması gerekir, aksi halde frontend token yenileme mantığı kırılır.

### 3. In-Memory Rate Limiter
**Dosya:** [rateLimit.ts](file:///d:/kanbanera/kanbanera/backend/src/middleware/rateLimit.ts#L15-L16)

Cloudflare Workers her request'te yeni bir isolate üzerinde çalışır, dolayısıyla in-memory [Map](file:///d:/kanbanera/kanbanera/backend/src/middleware/auth.ts#8-12) her instance'ta sıfırdan başlar ve **rate limiting fiilen çalışmaz**. KV veya D1 tabanlı bir çözüme geçilmelidir.

### 4. Forgot/Reset Password Backend Eksik
**Frontend:** [ForgotPasswordPage.tsx](file:///d:/kanbanera/kanbanera/frontend/src/pages/auth/ForgotPasswordPage.tsx), [ResetPasswordPage.tsx](file:///d:/kanbanera/kanbanera/frontend/src/pages/auth/ResetPasswordPage.tsx) mevcut ama karşılık gelen **backend endpoint'leri yok**. Bu sayfalar tamamen dekoratif durumdadır.

---

## 🟡 İşlevsel Olmayan UI Elemanları (Non-Functional Buttons)

| Sayfa | Eleman | Durum |
|---|---|---|
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | "Change Password" butonu | Hiçbir backend/modal fonksiyonu yok |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | "Delete Account" butonu | Backend endpoint yok |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | 2FA Toggle | Sadece local state, backend yok |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | Email / Push Notifications | Sadece local state, backend yok |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | Avatar Upload (Camera butonu) | Tıklanabilir ama dosya yükleme yok |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | "Member since" tarihi | Hardcoded "Dec 2024" |
| [ProfilePage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/ProfilePage.tsx#7-296) | "Pro Plan" badge | Hardcoded, plan sistemi yok |
| [App.tsx](file:///d:/kanbanera/kanbanera/frontend/src/App.tsx) | Members sayfası | Placeholder component |
| [CalendarPage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/CalendarPage.tsx#28-257) | "Week" görünüm butonu | State var ama Week view render edilmiyor |
| [DashboardLayout](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/DashboardLayout.tsx#11-107) | Header "Sprint 4" | Hardcoded değer |
| [BoardPage](file:///d:/kanbanera/kanbanera/frontend/src/pages/dashboard/BoardPage.tsx#11-403) | "Save Changes" butonu (TaskModal) | Mevcut ama tittle/description haricinde bir işlevi belirsiz |

---

## 🟠 Eksik Özellikler (Piyasa Karşılaştırması: Trello, Linear, Notion)

### Proje Yönetimi
- [ ] **Proje Ayarları Sayfası** — Proje adı/açıklama düzenleme, silme, arşivleme
- [ ] **Üye Davet Etme & Yönetimi** — InviteMemberModal mevcut ama backend eksik
- [ ] **Rol tabanlı erişim kontrolü** — Schema'da roller var ama enforce edilmiyor (herkes her şeyi yapabilir)

### Board & Task
- [ ] **Sütun Yönetimi (Column CRUD UI)** — Backend hazır ama frontend'de sütun ekleme/silme/düzenleme/sıralama UI'ı yok
- [ ] **Task Filtreleme** — BoardPage'de Filter butonu var ama çalışmıyor
- [ ] **Task Arama** — SearchModal var ama sadece route araması yapıyor, task arama yok
- [ ] **Subtask Silme** — Backend endpoint var (`DELETE /api/tasks/:id/subtasks/:subtaskId`) ama UI'da silme butonu yok
- [ ] **Yorum Silme** — Backend endpoint var ama UI'da silme butonu yok
- [ ] **Attachment Silme** — Backend endpoint var ama UI'da silme butonu yok
- [ ] **WIP (Work In Progress) Limit** göstergesi — DB'de `wip_limit` var ama UI'da gösterilmiyor
- [ ] **Task Öncelik Değiştirme** — TaskModal'da priority alanı gösterilmesine rağmen değiştirme UI'ı yok

### Kullanıcı Deneyimi
- [ ] **Bildirim Sistemi (Toast)** — `alert()` ve `confirm()` yerine premium toast bildirimleri
- [ ] **Keyboard Shortcuts** — (Esc ile modal kapatma var ama genel kısayollar yok)
- [ ] **Drag & Drop Column Reorder** — Backend hazır ama frontend'de yok
- [ ] **Empty States** — Bazı sayfalarda boş durum gösterimi eksik veya jenerik

### Auth & Güvenlik
- [ ] **Email doğrulama** — Kayıt sonrası email doğrulama yok
- [ ] **Şifre Değiştirme** — Backend + Frontend eksik
- [ ] **Hesap Silme** — Backend + Frontend eksik

---

## 🔵 Geliştirme Önerileri (Nice-to-Have)

| Kategori | Öneri |
|---|---|
| **Performance** | Task listelerinde virtualization (react-window) |
| **Realtime** | WebSocket/SSE ile canlı board güncellemesi (çoklu kullanıcı senaryosu) |
| **PWA** | Service Worker + offline support + push notifications |
| **i18n** | Çoklu dil desteği (Türkçe/İngilizce) |
| **Dark/Light Theme** | useTheme hook'u mevcut ama light tema CSS'i uygulanmamış |
| **Audit Trail** | Activity log'un UI'da daha detaylı gösterimi |
| **Export** | Board/Task CSV/PDF export |
| **Due Date Reminder** | Yaklaşan deadline uyarıları |

---

## Önerilen Uygulama Sırası

Aşağıdaki sıralama, **en az eforla en yüksek etkiyi** hedeflemektedir:

### Faz 1 — Kritik Düzeltmeler (Güvenlik + Hatalar)
1. SHA-256 → bcrypt parola hashleme
2. `/me` endpoint'ini access token ile düzeltme
3. Rate limiter'ı D1/KV tabanlı yapma
4. Non-functional butonları kaldırma veya "Coming Soon" labeli ekleme

### Faz 2 — Eksik CRUD İşlemleri
5. Subtask silme UI
6. Yorum silme UI
7. Attachment silme UI
8. Column yönetimi UI (ekleme, silme, renk değiştirme, sıralama)
9. Task Priority değiştirme UI

### Faz 3 — Proje & Üye Yönetimi
10. Proje ayarları sayfası (düzenleme, arşivleme, silme)
11. Üye davet etme backend + frontend
12. Rol tabanlı erişim kontrolü (viewer sadece okuyabilir, member düzenleyebilir)

### Faz 4 — UX & Polish
13. Toast notification sistemi (alert/confirm/prompt kaldırma)
14. Task filtreleme ve arama
15. Calendar week view
16. Şifre değiştirme (backend + frontend)
17. Empty state'lerin iyileştirilmesi

### Faz 5 — Gelişmiş Özellikler (Opsiyonel)
18. Light theme implementasyonu
19. Çoklu dil desteği
20. Realtime güncellemeler (WebSocket)
21. PWA + offline support

---

## User Review Required

> [!IMPORTANT]
> Bu plan yalnızca bir önceliklendirme önerisidir. Hangi Faz'ları uygulamak istediğinizi, hangi öğeleri atlamamı veya eklemememi belirtiniz. Onayınız sonrasında Faz 1'den itibaren uygulamaya başlayacağım.

> [!WARNING]
> **Faz 1** güvenlik düzeltmeleri production'a çıkmadan **mutlaka** yapılmalıdır. SHA-256 parola hashleme ciddi bir güvenlik açığıdır.
