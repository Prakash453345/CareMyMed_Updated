const fs = require('fs');
const path = require('path');

const dts = fs.readFileSync(path.join(__dirname, '../node_modules/lucide-react-native/dist/lucide-react-native.d.ts'), 'utf8');

function walk(dir) {
    let files = [];
    for (const f of fs.readdirSync(dir)) {
        const full = path.join(dir, f);
        if (fs.statSync(full).isDirectory()) {
            files.push(...walk(full));
        } else if (full.endsWith('.js') || full.endsWith('.jsx')) {
            files.push(full);
        }
    }
    return files;
}

const allFiles = walk(path.join(__dirname, '../src'));
const issues = [];

for (const file of allFiles) {
    const code = fs.readFileSync(file, 'utf8');
    const regex = /import\s*\{([^}]+)\}\s*from\s*['"]lucide-react-native['"]/g;
    let match;
    while ((match = regex.exec(code)) !== null) {
        const icons = match[1]
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => s.split(/\s+as\s+/)[0].trim());
        for (const ic of icons) {
            if (ic && !dts.includes('declare const ' + ic) && !dts.includes(ic + ':')) {
                issues.push({ file: path.relative(path.join(__dirname, '..'), file), icon: ic });
            }
        }
    }
}

console.log('Found ' + issues.length + ' missing icon imports:');
console.log(JSON.stringify(issues, null, 2));
