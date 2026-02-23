import ts from "typescript";

/**
 * Busca un decorador específico por su nombre en un array de modificadores.
 */
export function findDecorator(
  decorators: readonly ts.Decorator[],
  name: string,
): ts.Decorator | undefined {
  return decorators.find((d) => {
    if (!ts.isCallExpression(d.expression)) return false;
    const expression = d.expression.expression;
    return ts.isIdentifier(expression) && expression.text === name;
  });
}

/**
 * Filtra todos los decoradores que coincidan con un nombre (útil para múltiples @Validate).
 */
export function filterDecorators(
  decorators: readonly ts.Decorator[],
  name: string,
): ts.Decorator[] {
  return decorators.filter((d) => {
    if (!ts.isCallExpression(d.expression)) return false;
    const expression = d.expression.expression;
    return ts.isIdentifier(expression) && expression.text === name;
  });
}

/**
 * Extrae el primer argumento de un decorador (ej: la "key" en @Validate("body", ...)).
 */
export function extractKey(decorator: ts.Decorator): string {
  const call = decorator.expression as ts.CallExpression;
  const firstArg = call.arguments[0];
  if (ts.isStringLiteral(firstArg)) return firstArg.text;
  throw new Error(
    `KleanJS: El primer argumento de @Validate debe ser un string literal.`,
  );
}

/**
 * Extrae el nodo de tipo del Use<T>().
 * Busca el parámetro genérico dentro de la llamada a Use<T>().
 */
export function extractType(decorator: ts.Decorator): ts.TypeNode {
  const call = decorator.expression as ts.CallExpression;
  // Buscamos el argumento que contiene Use<T>()
  // En @Body(Use<T>()), es el argumento 0. En @Validate("key", Use<T>()), es el 1.
  const useCallArg = ts.isStringLiteral(call.arguments[0])
    ? call.arguments[1]
    : call.arguments[0];

  if (useCallArg && ts.isCallExpression(useCallArg)) {
    const typeArgs = useCallArg.typeArguments;
    if (typeArgs && typeArgs.length > 0) {
      return typeArgs[0]; // Retornamos el nodo de tipo <T>
    }
  }

  throw new Error(
    `KleanJS: No se pudo encontrar el genérico Use<T> en el decorador ${decorator.expression.getText()}`,
  );
}

/**
 * Genera el nodo AST para:
 * if(typeof event.key === 'string') event.key = JSON.parse(event.key);
 */
export function generateJsonParse(key: string): ts.Statement {
  return ts.factory.createIfStatement(
    ts.factory.createBinaryExpression(
      ts.factory.createTypeOfExpression(
        ts.factory.createPropertyAccessExpression(
          ts.factory.createIdentifier("event"),
          key,
        ),
      ),
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.factory.createStringLiteral("string"),
    ),
    ts.factory.createBlock([
      ts.factory.createExpressionStatement(
        ts.factory.createBinaryExpression(
          ts.factory.createPropertyAccessExpression(
            ts.factory.createIdentifier("event"),
            key,
          ),
          ts.SyntaxKind.EqualsToken,
          ts.factory.createCallExpression(
            ts.factory.createPropertyAccessExpression(
              ts.factory.createIdentifier("JSON"),
              "parse",
            ),
            undefined,
            [
              ts.factory.createPropertyAccessExpression(
                ts.factory.createIdentifier("event"),
                key,
              ),
            ],
          ),
        ),
      ),
    ]),
  );
}
