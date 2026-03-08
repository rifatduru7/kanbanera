const fs = require('fs');
const path = require('path');

const trPath = path.join(process.cwd(), 'src/locales/tr.json');
const enPath = path.join(process.cwd(), 'src/locales/en.json');

const buf = fs.readFileSync(trPath);

const win1254toUni = {
    0xFD: 'ı',
    0xFE: 'ş',
    0xF0: 'ğ',
    0xDD: 'İ',
    0xDE: 'Ş',
    0xD0: 'Ğ',
    0xE7: 'ç',
    0xC7: 'Ç',
    0xF6: 'ö',
    0xD6: 'Ö',
    0xFC: 'ü',
    0xDC: 'Ü'
};

let decoded = '';
for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    if (win1254toUni[byte]) {
        decoded += win1254toUni[byte];
    } else if (byte >= 0x80) {
        if (byte === 0xEF && buf[i + 1] === 0xBB && buf[i + 2] === 0xBF) {
            i += 2;
        } else {
            decoded += String.fromCharCode(byte);
        }
    } else {
        decoded += String.fromCharCode(byte);
    }
}

let trObj;
try {
    trObj = JSON.parse(decoded);
} catch (e) {
    const str = buf.toString('utf8');
    trObj = JSON.parse(str.replace(/\uFFFD/g, ''));
}

const enObj = JSON.parse(fs.readFileSync(enPath, 'utf8'));

const newAuthKeysEn = {
    "forgot_password_title": "Forgot password?",
    "forgot_password_subtitle": "Enter your account email and we will send a reset link.",
    "check_email": "Check your email",
    "reset_link_sent_to": "If this email is registered, a reset link has been sent to ",
    "back_to_login": "Back to login",
    "didnt_receive_it": "Didn't receive it?",
    "try_again": "Try again",
    "send_reset_link": "Send reset link",
    "sending": "Sending...",
    "remembered_password": "Remembered your password?",
    "invalid_link": "Invalid link",
    "invalid_link_subtitle": "This password reset link is invalid or expired.",
    "request_new_link": "Request a new link",
    "set_new_password": "Set new password",
    "set_new_password_subtitle": "Choose a new password with at least 8 characters.",
    "new_password_placeholder": "Enter new password",
    "confirm_new_password_placeholder": "Confirm new password",
    "reset_password_button": "Reset password",
    "updating": "Updating...",
    "password_updated": "Password updated",
    "redirecting_to_login": "Redirecting to login..."
};

const newAuthKeysTr = {
    "forgot_password_title": "Şifremi unuttum?",
    "forgot_password_subtitle": "Hesap e-postanızı girin, size bir sıfırlama bağlantısı gönderelim.",
    "check_email": "E-postanızı kontrol edin",
    "reset_link_sent_to": "Eğer bu e-posta kayıtlıysa, bir sıfırlama bağlantısı gönderildi: ",
    "back_to_login": "Giriş yap'a dön",
    "didnt_receive_it": "Yanıt almadınız mı?",
    "try_again": "Tekrar dene",
    "send_reset_link": "Sıfırlama bağlantısı gönder",
    "sending": "Gönderiliyor...",
    "remembered_password": "Şifrenizi hatırladınız mı?",
    "invalid_link": "Geçersiz bağlantı",
    "invalid_link_subtitle": "Bu şifre sıfırlama bağlantısı geçersiz veya süresi dolmuş.",
    "request_new_link": "Yeni bir bağlantı iste",
    "set_new_password": "Yeni şifre belirle",
    "set_new_password_subtitle": "En az 8 karakterli yeni bir şifre seçin.",
    "new_password_placeholder": "Yeni şifreyi girin",
    "confirm_new_password_placeholder": "Yeni şifreyi onaylayın",
    "reset_password_button": "Şifreyi sıfırla",
    "updating": "Güncelleniyor...",
    "password_updated": "Şifre güncellendi",
    "redirecting_to_login": "Giriş sayfasına yönlendiriliyor..."
};

const newErrorKeysEn = {
    "invalid_reset_token": "Invalid reset token",
    "failed_to_send_reset": "Failed to send reset link",
    "failed_to_reset": "Failed to reset password",
    "password_too_short": "Password must be at least 8 characters"
};

const newErrorKeysTr = {
    "invalid_reset_token": "Geçersiz sıfırlama bağlantısı",
    "failed_to_send_reset": "Sıfırlama bağlantısı gönderilemedi",
    "failed_to_reset": "Şifre sıfırlanamadı",
    "password_too_short": "Şifre en az 8 karakter olmalıdır"
};

function fixStrings(obj) {
    for (let k in obj) {
        if (typeof obj[k] === 'string') {
            let s = obj[k];
            s = s.replace(/ynetmek|ynetmek/g, 'yönetmek');
            s = s.replace(/iin|iin/g, 'için');
            s = s.replace(/giri|giri/g, 'giriş');
            s = s.replace(/yapn|yapn/g, 'yapın');
            s = s.replace(/Gelitiriciler|Gelitiriciler/g, 'Geliştiriciler');
            s = s.replace(/Ho|Ho/g, 'Hoş');
            s = s.replace(/kullanc|kullanc/g, 'kullanıcı');
            s = s.replace(/Kullanc|Kullanc/g, 'Kullanıcı');
            s = s.replace(/Baarl|Baarl/g, 'Başarılı');
            s = s.replace(/baarl|baarl/g, 'başarılı');
            s = s.replace(/Balant|Balant/g, 'Bağlantı');
            s = s.replace(/balan|balan/g, 'bağlan');
            s = s.replace(/Aktif alma|Aktif alma/g, 'Aktif Çalışma');
            s = s.replace(/Bota|Bota/g, 'Boşta');
            s = s.replace(/Deiiklikleri|Deiiklikleri/g, 'Değişiklikleri');
            s = s.replace(/A\u0131k|A\u0131k/g, 'Açık');
            s = s.replace(/grev/g, 'görev');
            s = s.replace(/Grev/g, 'Görev');
            s = s.replace(/Tm/g, 'Tüm');
            s = s.replace(/tm/g, 'tüm');
            obj[k] = s;
        } else if (typeof obj[k] === 'object' && obj[k] !== null) {
            fixStrings(obj[k]);
        }
    }
}

fixStrings(trObj);

trObj.auth = { ...trObj.auth, ...newAuthKeysTr };
enObj.auth = { ...enObj.auth, ...newAuthKeysEn };

trObj.auth.error = { ...(trObj.auth.error || {}), ...newErrorKeysTr };
enObj.auth.error = { ...(enObj.auth.error || {}), ...newErrorKeysEn };

fs.writeFileSync(trPath, JSON.stringify(trObj, null, 2), 'utf8');
fs.writeFileSync(enPath, JSON.stringify(enObj, null, 2), 'utf8');

console.log("Encoding fixed and new files written successfully.");
