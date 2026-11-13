import { readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import ts from "typescript";

// Catalog parity cannot detect untranslated JSX. Keep legacy technical examples,
// brands, language self-names and already-Spanish text in an explicit allowlist.
const root = resolve(import.meta.dirname, "../../..");
const exceptions = JSON.parse(
  readFileSync(join(import.meta.dirname, "fixtures/ui-literal-exceptions.json"), "utf8"),
) as { file: string; value: string }[];
const allowed = new Set(exceptions.map(({ file, value }) => `${file}:${value}`));
const catalog = JSON.parse(
  readFileSync(join(root, "packages/i18n/src/locales/es-MX.json"), "utf8"),
) as { interface: Record<string, string> };
const errors: string[] = [];
const seen = new Set<string>();
function inspectLiteral(name: string, value: string): void {
  if (!/[A-Za-z]{2}/.test(value)) return;
  checked++;
  seen.add(`${name}:${value}`);
  if (!allowed.has(`${name}:${value}`))
    errors.push(`${name}: untranslated UI literal ${JSON.stringify(value)}`);
}
// Only inspect rendered branches and human-facing attributes, not IDs, styles,
// request paths, payload enums, callbacks or translation key arguments.
function renderedExpression(node: ts.Node, name: string): void {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    inspectLiteral(name, node.text);
  else if (ts.isConditionalExpression(node)) {
    renderedExpression(node.whenTrue, name);
    renderedExpression(node.whenFalse, name);
  } else if (ts.isBinaryExpression(node)) {
    if (
      [
        ts.SyntaxKind.AmpersandAmpersandToken,
        ts.SyntaxKind.BarBarToken,
        ts.SyntaxKind.QuestionQuestionToken,
      ].includes(node.operatorToken.kind)
    )
      renderedExpression(node.right, name);
    else if (node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
      renderedExpression(node.left, name);
      renderedExpression(node.right, name);
    }
  } else if (ts.isTemplateExpression(node)) {
    inspectLiteral(name, node.head.text);
    for (const span of node.templateSpans) inspectLiteral(name, span.literal.text);
  } else if (ts.isParenthesizedExpression(node)) renderedExpression(node.expression, name);
}

let checked = 0;
function walk(dir: string): void {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    const file = join(dir, item.name);
    if (item.isDirectory()) {
      if (!["node_modules", "__tests__"].includes(item.name)) walk(file);
      continue;
    }
    if (!file.endsWith(".tsx") || file.includes(".test.")) continue;
    const source = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const name = relative(root, file);
    const check = (node: ts.Node): void => {
      let value: string | undefined;
      if (ts.isJsxText(node)) value = node.text.replace(/\s+/g, " ").trim();
      if (
        ts.isJsxAttribute(node) &&
        node.initializer &&
        ts.isStringLiteral(node.initializer) &&
        ["placeholder", "title", "aria-label", "alt"].includes(node.name.getText(source))
      )
        value = node.initializer.text;
      if (value) inspectLiteral(name, value);
      if (ts.isJsxExpression(node) && node.expression && !ts.isJsxAttribute(node.parent))
        renderedExpression(node.expression, name);
      if (
        ts.isJsxAttribute(node) &&
        node.initializer &&
        ts.isJsxExpression(node.initializer) &&
        node.initializer.expression &&
        ["placeholder", "title", "aria-label", "alt"].includes(node.name.getText(source))
      )
        renderedExpression(node.initializer.expression, name);
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source) === "uiText" &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0])
      ) {
        const key = node.arguments[0].text;
        if (key.startsWith("interface.") && !Object.hasOwn(catalog.interface, key.slice(10)))
          errors.push(`${name}: missing interface key ${JSON.stringify(key)}`);
      }
      if (
        ts.isStringLiteral(node) &&
        /^(interface|validation|common|aiUi|apiMessages|displayEnums)\./.test(node.text)
      ) {
        let current: unknown = catalog;
        for (const part of node.text.split("."))
          current =
            typeof current === "object" && current !== null
              ? (current as Record<string, unknown>)[part]
              : undefined;
        if (typeof current !== "string") errors.push(`${name}: missing semantic key ${node.text}`);
      }
      ts.forEachChild(node, check);
    };
    check(source);
  }
}
walk(join(root, "apps/admin/src"));
walk(join(root, "apps/portal/src"));
if (process.argv.includes("--prune-exceptions")) {
  const kept = exceptions.filter(({ file, value }) => seen.has(`${file}:${value}`));
  const unique = [
    ...new Map(kept.map((entry) => [`${entry.file}:${entry.value}`, entry])).values(),
  ];
  console.log(JSON.stringify(unique, null, 2));
  process.exit(0);
}
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `UI literal guard passed (${String(checked)} documented exceptions; translated JSX checked against catalog).`,
);
