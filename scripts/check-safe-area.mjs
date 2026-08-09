import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8');
const reactNativeImport = source.match(/import\s*\{([\s\S]*?)\}\s*from ['"]react-native['"];?/);
const usesDeprecatedImport = reactNativeImport?.[1].split(',').some((name) => name.trim() === 'SafeAreaView');
const hasProvider = /import\s*\{[^}]*SafeAreaProvider[^}]*\}\s*from ['"]react-native-safe-area-context['"]/.test(source)
  && /<SafeAreaProvider>/.test(source);

if (usesDeprecatedImport) {
  console.error('RED: App imports deprecated react-native SafeAreaView');
  process.exit(1);
}
if (!hasProvider) {
  console.error('RED: SafeAreaProvider is missing at the app root');
  process.exit(1);
}
console.log('GREEN: safe-area-context provider and SafeAreaView are configured');
