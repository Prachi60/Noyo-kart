const fs = require('fs');
const path = require('path');

function walk(dir) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    const fp = path.join(dir, f);
    if (fs.statSync(fp).isDirectory()) walk(fp);
    else if (f.endsWith('.js') || f.endsWith('.jsx')) {
      let c = fs.readFileSync(fp, 'utf8');
      let n = c
        .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/firebase'/g, "from '../../../firebase'")
        .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/theme'/g, "from '../../../theme'")
        .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/utils\//g, "from '../../../utils/")
        .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/services\//g, "from '../../../services/")
        .replace(/from '\.\.\/\.\.\/\.\.\/\.\.\/\.\.\/assets\//g, "from '../../../../assets/");
      if (n !== c) fs.writeFileSync(fp, n);
    }
  });
}

walk(path.join(__dirname, 'src', 'modules', 'serviceProvider'));
console.log('Import paths fixed!');
