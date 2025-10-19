/**
 * TypeScript Handler
 * Simple TypeScript to JavaScript transpiler for basic cases
 */

export function transpileTypeScript(code: string): string {
  // Simple TypeScript to JavaScript conversion
  // This handles basic type annotations but not complex TS features
  
  let jsCode = code;
  
  // Remove type annotations from function parameters and return types
  jsCode = jsCode.replace(/:\s*\w+(\[\])?(\s*\|[^=,){\n]*)?(?=\s*[,)={\n])/g, '');
  
  // Remove interface declarations
  jsCode = jsCode.replace(/interface\s+\w+\s*{[^}]*}/g, '');
  
  // Remove type aliases
  jsCode = jsCode.replace(/type\s+\w+\s*=\s*[^;\n]+;?/g, '');
  
  // Remove generic type parameters
  jsCode = jsCode.replace(/<[^>]*>/g, '');
  
  // Remove 'as' type assertions
  jsCode = jsCode.replace(/\s+as\s+\w+/g, '');
  
  // Remove variable type annotations
  jsCode = jsCode.replace(/:\s*\w+(\[\])?(?=\s*[=;,\n])/g, '');
  
  // Remove export/import type syntax
  jsCode = jsCode.replace(/import\s+type\s+/g, 'import ');
  jsCode = jsCode.replace(/export\s+type\s+/g, 'export ');
  
  return jsCode;
}

export function isTypeScriptCode(code: string): boolean {
  // Check if code contains TypeScript-specific syntax
  const tsPatterns = [
    /:\s*\w+(\[\])?(\s*\|[^=,){\n]*)?(?=\s*[,)={\n])/, // Type annotations
    /interface\s+\w+/, // Interface declarations
    /type\s+\w+\s*=/, // Type aliases
    /<[^>]*>/, // Generic types
    /\s+as\s+\w+/, // Type assertions
    /import\s+type/, // Type imports
    /export\s+type/ // Type exports
  ];
  
  return tsPatterns.some(pattern => pattern.test(code));
}

export function handleTypeScriptExecution(code: string, language: string): { code: string; language: string } {
  if (language === 'typescript' || (language === 'javascript' && isTypeScriptCode(code))) {
    // Transpile TypeScript to JavaScript
    const jsCode = transpileTypeScript(code);
    return {
      code: jsCode,
      language: 'javascript'
    };
  }
  
  return { code, language };
}