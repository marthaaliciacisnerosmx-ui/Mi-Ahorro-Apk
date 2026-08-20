interface Slice {
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
}

export default function DonutChart({ slices, size = 160 }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);
  const radius = size / 2 - 12;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((slice, i) => {
      const fraction = total > 0 ? slice.value / total : 0;
      const dash = fraction * circumference;
      const arc = {
        key: i,
        color: slice.color,
        dash,
        gap: circumference - dash,
        offset: -offset,
      };
      offset += dash;
      return arc;
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#1e293b" strokeWidth={16} />
      {total > 0 &&
        arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arc.color}
            strokeWidth={16}
            strokeDasharray={`${arc.dash} ${arc.gap}`}
            strokeDashoffset={arc.offset}
            transform={`rotate(-90 ${cx} ${cy})`}
            style={{ transition: 'stroke-dasharray 500ms ease, stroke-dashoffset 500ms ease' }}
          />
        ))}
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-slate-400 text-[10px]">Total</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-white font-bold text-[13px]">
        {total > 0 ? slices.length : '—'}
      </text>
    </svg>
  );
}
