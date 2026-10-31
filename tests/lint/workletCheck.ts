import ts from 'typescript';

/** Nombres de `export function` cuya primera sentencia no es la directiva `'worklet'`. */
export function missingWorkletExports(source: string): string[] {
  const file = ts.createSourceFile('x.ts', source, ts.ScriptTarget.Latest, true);
  const missing: string[] = [];
  for (const node of file.statements) {
    if (!ts.isFunctionDeclaration(node) || !node.body) continue;
    const exported = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!exported) continue;
    const first = node.body.statements[0];
    const isWorklet = first !== undefined && ts.isExpressionStatement(first) && ts.isStringLiteral(first.expression) && first.expression.text === 'worklet';
    if (!isWorklet) missing.push(node.name?.text ?? '?');
  }
  return missing;
}
