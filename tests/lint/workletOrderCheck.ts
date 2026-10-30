import ts from 'typescript';

function isWorkletBody(body: ts.ConciseBody | undefined): boolean {
  if (body === undefined || !ts.isBlock(body)) return false;
  const first = body.statements[0];
  return first !== undefined && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'worklet';
}

/**
 * Worklets que usan una función o constante del mismo archivo declarada **más abajo** (`"worklet → nombre"`).
 * El plugin de worklets captura el cierre al definir la función, así que esas referencias llegan como `undefined`
 * al hilo de la cámara o de UI, aunque en Vitest (sin worklets) todo funcione.
 */
export function workletForwardReferences(source: string): string[] {
  const file = ts.createSourceFile('x.tsx', source, ts.ScriptTarget.Latest, true);
  const declaredAt = new Map<string, number>();
  for (const st of file.statements) {
    if (ts.isFunctionDeclaration(st) && st.name) declaredAt.set(st.name.text, st.getStart());
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) if (ts.isIdentifier(d.name)) declaredAt.set(d.name.text, st.getStart());
    }
  }

  const found: string[] = [];
  const check = (name: string, start: number, body: ts.Node): void => {
    const seen = new Set<string>();
    const visit = (n: ts.Node): void => {
      if (ts.isIdentifier(n) && !seen.has(n.text)) {
        const at = declaredAt.get(n.text);
        const p = n.parent;
        const isPropertyName = (ts.isPropertyAccessExpression(p) && p.name === n) || (ts.isPropertyAssignment(p) && p.name === n);
        if (at !== undefined && at > start && !isPropertyName && !ts.isTypeReferenceNode(p)) {
          seen.add(n.text);
          found.push(`${name} → ${n.text}`);
        }
      }
      ts.forEachChild(n, visit);
    };
    visit(body);
  };

  for (const st of file.statements) {
    if (ts.isFunctionDeclaration(st) && st.name && st.body && isWorkletBody(st.body)) check(st.name.text, st.getStart(), st.body);
    if (ts.isVariableStatement(st)) {
      for (const d of st.declarationList.declarations) {
        const init = d.initializer;
        if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) && isWorkletBody(init.body)) {
          check(d.name.getText(file), st.getStart(), init.body);
        }
      }
    }
  }
  return found;
}
