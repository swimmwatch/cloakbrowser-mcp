/** Serialize a string literal safely for JavaScript and embedded script contexts. */
export function serializeJavaScriptString(value: string): string {
  const serialized = JSON.stringify(value);
  return serialized.replace(/[<>\u2028\u2029]/gu, (character) => {
    const codePoint = character.charCodeAt(0);
    const hexadecimal = codePoint.toString(16);
    const padded = hexadecimal.padStart(4, '0');
    return `\\u${padded}`;
  });
}
