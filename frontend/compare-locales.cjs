const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];
    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        }
    });
    return arrayOfFiles;
}

const files = getAllFiles(path.join(process.cwd(), 'src'));

const keysUsed = new Set();
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    // Match useTranslation's t function calls exactly, e.g. t('auth.login') 
    // Allow single or double quotes, and match until the closing quote
    const matches = [...content.matchAll(/\bt\(['"]([a-zA-Z0-9_\.]+)['"]/g)];
    matches.forEach(m => keysUsed.add(m[1]));
});

function getKeys(obj, prefix = '') {
    let keys = [];
    for (let k in obj) {
        if (typeof obj[k] === 'object' && obj[k] !== null) {
            keys = keys.concat(getKeys(obj[k], prefix + k + '.'));
        } else {
            keys.push(prefix + k);
        }
    }
    return keys;
}

const enObj = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/locales/en.json'), 'utf8'));
const trObj = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'src/locales/tr.json'), 'utf8'));

const enKeys = new Set(getKeys(enObj));
const trKeys = new Set(getKeys(trObj));

const missingKeys = [];
keysUsed.forEach(k => {
    if (!enKeys.has(k) || !trKeys.has(k)) {
        missingKeys.push(k);
    }
});

const report = [
    "--- KEYS IN CODE BUT NOT IN LOCALE FILES ---",
    ...missingKeys.sort().map(k => `${k} (in EN: ${enKeys.has(k)}, in TR: ${trKeys.has(k)})`),
    "",
    "--- KEYS IN EN BUT NOT IN TR ---",
    ...[...enKeys].filter(k => !trKeys.has(k)).sort(),
    "",
    "--- KEYS IN TR BUT NOT IN EN ---",
    ...[...trKeys].filter(k => !enKeys.has(k)).sort()
].join('\n');

fs.writeFileSync('locales-report.txt', report);
console.log('Report generated at locales-report.txt');
