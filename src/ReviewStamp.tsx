import Svg, { Circle, G, Path } from 'react-native-svg';

export function ReviewStamp({ ink }: { ink: string }) {
  return <Svg width={48} height={48} viewBox="0 0 56 56" accessible={false}>
    <G rotation={-14} originX={28} originY={28} fill="none" stroke={ink}>
      <Circle cx={28} cy={28} r={23} strokeWidth={2.6} strokeDasharray="36 1 15 1 41 1 48 1" />
      <Circle cx={28} cy={28} r={19.5} strokeWidth={.8} opacity={.56} />
      <Path strokeWidth={2.9} strokeLinecap="round" strokeLinejoin="round"
        d="M16 19l4 3 M15 27l4 3 M19 33l-4 8 M24 21h16 M30 17l3 3 M26 23q3 5 13 8 M36 23q-3 5-13 9 M27 32q0 6-3 10 M37 31v10 M28 34h8 M28 38h8" />
    </G>
  </Svg>;
}
