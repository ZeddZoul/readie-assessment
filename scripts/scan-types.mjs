// Granular type-safety scan using the TypeScript checker (not regex).
// Reports: explicit `any`, any expression whose type resolves to `any` (implicit any),
// type assertions (except `as const`), non-null assertions, ts/eslint suppression comments,
// and loose types (Function, Object, object, {}).
//   node scripts/scan-types.mjs [tsconfig ...]
import ts from 'typescript';
import { relative } from 'node:path';

const configs = process.argv.slice(2).length ? process.argv.slice(2) : ['tsconfig.json', 'tsconfig.node.json', 'tsconfig.scripts.json'];
// Built from parts so this file's own source never matches it.
const SUPPRESSION = new RegExp(['@ts-(ignore|expect-error|nocheck)', ['eslint', 'disable'].join('-')].join('|'), 'g');

/** @type {string[]} */
const findings = [];
/** Third-party generic types whose own declarations default a parameter to `any` (e.g. Location<any>). */
/** @type {Set<string>} */
const libraryDefaults = new Set();
/**
 * @param {ts.SourceFile} sf
 * @param {ts.Node} node
 * @param {string} kind
 * @param {string} detail
 */
const add = (sf, node, kind, detail) => {
  const { line, character } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  findings.push(`${relative(process.cwd(), sf.fileName)}:${line + 1}:${character + 1}  ${kind}  ${detail}`);
};

/**
 * @param {ts.Type} type
 * @returns {type is ts.TypeReference}
 */
function isTypeReference(type) {
  if (!('objectFlags' in type) || typeof type.objectFlags !== 'number') return false;
  return (type.objectFlags & ts.ObjectFlags.Reference) !== 0;
}

/**
 * `any` itself, or `any` nested in type arguments (Promise<any>, any[]) or union/intersection members.
 * @param {ts.TypeChecker} checker
 * @param {ts.Type} type
 * @param {number} [depth]
 * @returns {boolean}
 */
function containsAny(checker, type, depth = 0) {
  if (depth > 3) return false;
  if (type.flags & ts.TypeFlags.Any) return true;
  if (type.isUnionOrIntersection()) return type.types.some((t) => containsAny(checker, t, depth + 1));
  if (isTypeReference(type)) return checker.getTypeArguments(type).some((t) => containsAny(checker, t, depth + 1));
  return false;
}

/**
 * `any` that our code is actually holding: a bare `any`, or `any` inside the built-in containers
 * that carry our values (Array, ReadonlyArray, Promise, Set, Map). `any` buried in a third-party
 * generic's default parameter (React's ReactNode, React Router's Location, Vite's Plugin) is reported
 * separately: it comes from those libraries' declarations, not from our code.
 * @param {ts.TypeChecker} checker
 * @param {ts.Type} type
 * @returns {boolean}
 */
function isOwnAny(checker, type) {
  if (type.flags & ts.TypeFlags.Any) return true;
  if (type.isUnionOrIntersection()) return type.types.some((t) => isOwnAny(checker, t));
  const name = type.getSymbol()?.getName();
  if (name && /^(Array|ReadonlyArray|Promise|Set|Map)$/.test(name) && isTypeReference(type)) {
    return checker.getTypeArguments(type).some((t) => isOwnAny(checker, t));
  }
  return false;
}

/**
 * True when the node is a runtime value expression (not a type, JSX tag name, import binding or property key).
 * @param {ts.Node} node
 * @returns {boolean}
 */
function isValuePosition(node) {
  for (let a = node.parent; a; a = a.parent) {
    if (ts.isTypeNode(a) || ts.isQualifiedName(a) || ts.isExpressionWithTypeArguments(a) || ts.isTypeAliasDeclaration(a) || ts.isInterfaceDeclaration(a)) return false;
    if (ts.isStatement(a) || ts.isBlock(a)) break;
  }
  const p = node.parent;
  if (ts.isJsxOpeningElement(p) || ts.isJsxClosingElement(p) || ts.isJsxSelfClosingElement(p)) return p.tagName !== node;
  if (ts.isJsxAttribute(p) && p.name === node) return false;
  if (ts.isImportSpecifier(p) || ts.isImportClause(p) || ts.isNamespaceImport(p) || ts.isExportSpecifier(p)) return false;
  if (ts.isBindingElement(p) && p.propertyName === node) return false;
  if ((ts.isPropertyAssignment(p) || ts.isPropertySignature(p) || ts.isPropertyDeclaration(p) || ts.isMethodDeclaration(p)) && p.name === node) return false;
  if (ts.isPropertyAccessExpression(p) && p.name === node) return false;
  return true;
}

for (const configPath of configs) {
  // getParsedCommandLineOfConfigFile is fully typed (readConfigFile returns `config: any`).
  const parsed = ts.getParsedCommandLineOfConfigFile(configPath, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (d) => {
      throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
    },
  });
  if (!parsed) throw new Error(`Could not read ${configPath}`);
  const program = ts.createProgram(parsed.fileNames, parsed.options);
  const checker = program.getTypeChecker();

  for (const sf of program.getSourceFiles()) {
    if (sf.isDeclarationFile || sf.fileName.includes('node_modules')) continue;
    const text = sf.getFullText();
    for (const m of text.matchAll(SUPPRESSION)) {
      const { line } = sf.getLineAndCharacterOfPosition(m.index ?? 0);
      findings.push(`${relative(process.cwd(), sf.fileName)}:${line + 1}  suppression  ${m[0]}`);
    }
    /** @param {ts.Node} node */
    const visit = (node) => {
      if (node.kind === ts.SyntaxKind.AnyKeyword) add(sf, node, 'explicit-any', node.parent.getText(sf).slice(0, 80));
      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        const t = node.type.getText(sf);
        if (t !== 'const') add(sf, node, 'type-assertion', node.getText(sf).replace(/\s+/g, ' ').slice(0, 100));
      }
      if (ts.isNonNullExpression(node)) add(sf, node, 'non-null', node.getText(sf).slice(0, 80));
      if (ts.isTypeReferenceNode(node) && /^(Function|Object)$/.test(node.typeName.getText(sf))) add(sf, node, 'loose-type', node.getText(sf));
      if (node.kind === ts.SyntaxKind.ObjectKeyword) add(sf, node, 'loose-type', 'object');
      if (ts.isTypeLiteralNode(node) && node.members.length === 0) add(sf, node, 'loose-type', '{}');
      // Implicit any: value expressions whose resolved type is `any`.
      if ((ts.isIdentifier(node) || ts.isCallExpression(node) || ts.isPropertyAccessExpression(node)) && isValuePosition(node)) {
        const type = checker.getTypeAtLocation(node);
        if (containsAny(checker, type)) {
          const where = `${node.getText(sf).slice(0, 60)} : ${checker.typeToString(type).slice(0, 60)}`;
          if (isOwnAny(checker, type)) add(sf, node, 'implicit-any', where);
          else libraryDefaults.add(checker.typeToString(type).split('<')[0] ?? '');
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(sf);
  }
}

const unique = [...new Set(findings)].sort();
if (libraryDefaults.size) {
  console.log(`Info: third-party types with \`any\` default parameters (not from this codebase): ${[...libraryDefaults].sort().join(', ')}`);
}
if (unique.length) {
  console.log(unique.join('\n'));
  console.log(`\n${unique.length} finding(s)`);
  process.exit(1);
}
console.log('Type scan clean: no any (explicit or implicit), assertions, non-null assertions, suppressions or loose types.');
