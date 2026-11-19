import Svg, { G, Path } from 'react-native-svg';

const leaves = [
  [25, 40, -27], [26, 52, -53], [31, 65, -70], [39, 77, -88], [51, 87, -104],
  [28, 58, 49], [35, 72, 35], [46, 83, 21], [57, 90, 11],
] as const;

export function VictoryLaurels({ color }: { color: string }) {
  return <Svg width="100%" height={105} viewBox="0 0 160 104" pointerEvents="none" accessible={false}
    style={{ position: 'absolute', top: -1, maxWidth: 168, opacity: .8 }}>
    {[false, true].map((mirror) => (
      <G key={String(mirror)} transform={mirror ? 'translate(160 0) scale(-1 1)' : undefined}>
        <Path d="M65 93 C43 87 22 67 25 36" stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round" />
        {leaves.map(([x, y, angle]) =>
          <Path key={y} transform={`translate(${x} ${y}) rotate(${angle})`}
            d="M0 1 C-5 -4 -4 -12 0 -17 C4 -12 5 -4 0 1Z" fill={color} />)}
      </G>
    ))}
  </Svg>;
}
