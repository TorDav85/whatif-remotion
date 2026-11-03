import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import ts from 'typescript';

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const printer = ts.createPrinter({removeComments: true});
export function cameraSignature(root) {
  const files = [];
  const walk = (dir) => {for (const e of fs.readdirSync(dir, {withFileTypes: true})) {
    const p = path.join(dir, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|json|mjs)$/.test(e.name)) files.push(p);
  }};
  walk(path.join(root, 'src'));
  const result = {};
  for (const file of files.sort()) {
    const relative = path.relative(root, file).replaceAll('\\', '/');
    if (relative.startsWith('src/releases/')) continue;
    const text = fs.readFileSync(file, 'utf8');
    if (file.endsWith('.json')) {
      const obj = JSON.parse(text);
      const cameras = {};
      for (const [k, v] of Object.entries(obj)) if (/camera|shots/i.test(k)) cameras[k] = v;
      if (Object.keys(cameras).length) result[relative] = sha(JSON.stringify(cameras));
      continue;
    }
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const fragments = [];
    const visit = (node) => {
      if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name && /^(cameraAt|camAt|shotAt|SHOTS|CUTS|CameraRig|Rig|cam|camera|target|fov|pos)$/i.test(node.name.getText(source))) {
        fragments.push(printer.printNode(ts.EmitHint.Unspecified, node, source));
        return;
      }
      if ((ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) && /^(CameraRig|Rig)$/.test(node.tagName.getText(source))) fragments.push(printer.printNode(ts.EmitHint.Unspecified, node, source));
      if (ts.isExpressionStatement(node) && /^(camera|cam|target|fov)\s*=/.test(node.getText(source))) fragments.push(printer.printNode(ts.EmitHint.Unspecified, node, source));
      ts.forEachChild(node, visit);
    };
    if (/\/(camera|motion|time)\.[^/]+$/.test(relative)) result[relative] = sha(text);
    else {visit(source); if (fragments.length) result[relative] = sha(fragments.join('\n'));}
  }
  return result;
}

export function assertCamerasLocked(root, baseline) {
  const current = cameraSignature(root);
  const changed = Object.keys(baseline).filter((file) => current[file] !== baseline[file]);
  if (changed.length) throw new Error(`Caméras modifiées depuis la préparation 2.01 : ${changed.join(', ')}`);
  return {files: Object.keys(baseline).length, unchanged: true};
}
