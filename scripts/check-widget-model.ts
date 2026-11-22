import { check, formatValue } from 'tla-ts';

const folder = new URL('../verification/widget-refresh/', import.meta.url);
const configName = process.argv.includes('--mutate-freshness') ? 'StalePublication.cfg' : 'WidgetRefresh.cfg';
const [source, config] = await Promise.all([
  Bun.file(new URL('WidgetRefresh.tla', folder)).text(),
  Bun.file(new URL(configName, folder)).text(),
]);

const result = await check({ source, config });
if (result.status === 'success') {
  console.log(`Widget model passed ${result.distinctStates} reachable states with tla-ts.`);
} else {
  const { violation, failure } = result;
  console.error(`Widget model failed with ${result.status}${violation ? ` (${violation.name})` : ''}.`);
  if (failure) console.error(failure);
  for (const step of violation?.trace ?? []) {
    console.error(step.action ?? 'Initial state');
    for (const [name, value] of Object.entries(step.state)) {
      console.error(`  ${name} = ${formatValue(value)}`);
    }
  }
  process.exitCode = 1;
}
