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
    const matches = [...content.matchAll(/t\(['"`](.*?)['"`]\)/g)];
    matches.forEach(m => keysUsed.add(m[1]));
});

// A function to get all flattened keys from a JSON object
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

const missingInEn = [];
const missingInTr = [];

keysUsed.forEach(k => {
    if (!enKeys.has(k)) missingInEn.push(k);
    if (!trKeys.has(k)) missingInTr.push(k);
});

console.log('--- Missing in EN ---');
missingInEn.forEach(k => console.log(k));

console.log('\n--- Missing in TR ---');
missingInTr.forEach(k => console.log(k));
