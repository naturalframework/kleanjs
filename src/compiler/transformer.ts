import ts from "typescript";
import { transform as typiaTransform } from "typia/lib/transform";

/**
 * KleanJS AOT Transformer
 * Transforma decoradores @Body y @Validate.
 */
export default function kleanTransformer(
  program: ts.Program,
): ts.TransformerFactory<ts.SourceFile> {
  const typeChecker = program.getTypeChecker();

  return (context: ts.TransformationContext) => {
    return (sourceFile: ts.SourceFile) => {
      let importNeeded = false;

      const visitor = (node: ts.Node): ts.Node => {
        // 1. Identificar métodos con decoradores de KleanJS
        if (ts.isMethodDeclaration(node)) {
          const decorators = ts.getDecorators(node) || [];

          const bodyDec = decorators.find((d) => isKleanDecorator(d, "Body"));
          const validateDecs = decorators.filter((d) =>
            isKleanDecorator(d, "Validate"),
          );
          const responseDec = decorators.find((d) =>
            isKleanDecorator(d, "Response"),
          );

          if (bodyDec || validateDecs.length > 0) {
            const statements: ts.Statement[] = [];

            // A. Inyectar normalización de Body (Solo si existe @Body)
            if (bodyDec) {
              importNeeded = true;
              statements.push(generateGetBodyCall("body"));
              const typeNode = extractTypeNode(bodyDec);
              if (typeNode)
                statements.push(generateTypiaAssert("body", typeNode));
            }

            // B. Inyectar validaciones para otros atributos (@Validate)
            validateDecs.forEach((dec) => {
              const key = extractStringArg(dec);
              const typeNode = extractTypeNode(dec);
              if (typeNode) statements.push(generateTypiaAssert(key, typeNode));
            });

            // C. Reconstruir el método sin decoradores y con lógica inyectada
            return ts.factory.updateMethodDeclaration(
              node,
              node.modifiers?.filter((m) => !ts.isDecorator(m)), // Limpieza AOT
              node.asteriskToken,
              node.name,
              node.questionToken,
              node.typeParameters,
              node.parameters,
              node.type,
              ts.factory.createBlock(
                [...statements, ...(node.body?.statements || [])],
                true,
              ),
            );
          }
        }
        return ts.visitEachChild(node, visitor, context);
      };

      // Ejecutar transformación de KleanJS
      let transformedFile = ts.visitNode(sourceFile, visitor) as ts.SourceFile;

      // Inyectar import de getBody si fue necesario
      if (importNeeded) {
        transformedFile = injectKleanImport(transformedFile);
      }

      // Finalmente, pasar el resultado al transformador de Typia para generar la validación imperativa
      return typiaTransform(program, {}, {})(context)(transformedFile);
    };
  };
}

function isKleanDecorator(d: ts.Decorator, name: string): boolean {
  return (
    ts.isCallExpression(d.expression) &&
    ts.isIdentifier(d.expression.expression) &&
    d.expression.expression.text === name
  );
}

function extractTypeNode(d: ts.Decorator): ts.TypeNode | undefined {
  const call = d.expression as ts.CallExpression;
  const useCall = call.arguments.find(
    (arg) =>
      ts.isCallExpression(arg) && (arg.expression as any).escapedText === "Use",
  );
  return useCall && ts.isCallExpression(useCall)
    ? useCall.typeArguments?.[0]
    : undefined;
}

function extractStringArg(d: ts.Decorator): string {
  const call = d.expression as ts.CallExpression;
  return (call.arguments[0] as ts.StringLiteral).text;
}

function generateGetBodyCall(key: string): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createBinaryExpression(
      ts.factory.createPropertyAccessExpression(
        ts.factory.createIdentifier("event"),
        key,
      ),
      ts.factory.createToken(ts.SyntaxKind.EqualsToken),
      ts.factory.createCallExpression(
        ts.factory.createIdentifier("getBody"),
        undefined,
        [ts.factory.createIdentifier("event")],
      ),
    ),
  );
}

function generateTypiaAssert(key: string, typeNode: ts.TypeNode): ts.Statement {
  return ts.factory.createExpressionStatement(
    ts.factory.createCallExpression(
      ts.factory.createIdentifier("typia.assert"),
      [typeNode],
      [
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("event"),
          key,
        ),
      ],
    ),
  );
}

function injectKleanImport(sourceFile: ts.SourceFile): ts.SourceFile {
  const kleanImport = ts.factory.createImportDeclaration(
    undefined,
    ts.factory.createImportClause(
      false,
      undefined,
      ts.factory.createNamedImports([
        ts.factory.createImportSpecifier(
          false,
          undefined,
          ts.factory.createIdentifier("getBody"),
        ),
      ]),
    ),
    ts.factory.createStringLiteral("@kleanjs/core/utils"),
  );
  return ts.factory.updateSourceFile(sourceFile, [
    kleanImport,
    ...sourceFile.statements,
  ]);
}
