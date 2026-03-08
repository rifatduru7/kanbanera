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
    // Match t('key') or t("key") or t(`key`)
    const matches = [...content.matchAll(/t\(['"`]([a-zA-Z0-9_\.]+)['"`]/g)];
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

console.log("ACTUAL MISSING KEYS:");
missingKeys.forEach(k => console.log(k));
