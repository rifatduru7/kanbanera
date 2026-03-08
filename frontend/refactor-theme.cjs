const fs = require('fs');
const path = require('path');

const files = [
    'src/pages/auth/LoginPage.tsx',
    'src/pages/auth/RegisterPage.tsx',
    'src/pages/auth/ForgotPasswordPage.tsx',
    'src/pages/auth/ResetPasswordPage.tsx',
];

const replaceMap = [
    { from: /text-white\/90/g, to: 'text-text' },
    { from: /text-white\/70/g, to: 'text-text-muted' },
    { from: /text-white(?=[\s"'])/g, to: 'text-text' },
    { from: /text-slate-300|text-slate-400|text-slate-500/g, to: 'text-text-muted' },
    { from: /bg-white\/5|bg-white\/10/g, to: 'bg-surface-alt' },
    { from: /border-white\/10|border-white\/20|border-border\/30|border-slate-600|border-slate-700/g, to: 'border-border' },
    { from: /hover:bg-white\/5|hover:bg-white\/10/g, to: 'hover:bg-border' },
    { from: /hover:text-white/g, to: 'hover:text-text' },
    { from: /bg-\[#16212b\]/g, to: 'bg-surface' },
    { from: /from-white/g, to: 'from-text' },
    { from: /font-semibold text-primary hover:text-text transition-colors/g, to: 'font-semibold text-primary hover:text-primary/80 transition-colors' },
    { from: /fill-white/g, to: 'fill-current' },
];

files.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) return;

    let content = fs.readFileSync(fullPath, 'utf8');

    replaceMap.forEach(({ from, to }) => {
        content = content.replace(from, to);
    });

    // Revert buttons that should be white: 'bg-primary ... text-text' -> text-white
    content = content.replace(/(bg-primary(?:(?!\btext-(?:text|white)\b).)*)\btext-text\b/g, "$1text-white");

    // Custom fix for specific button patterns where text was moved
    content = content.replace(/text-text(.*?)bg-primary/g, "text-white$1bg-primary");
    // Also specific for social buttons using svg fills:
    content = content.replace(/text-text hover:text-text/g, "text-text-muted hover:text-text");

    fs.writeFileSync(fullPath, content);
});
