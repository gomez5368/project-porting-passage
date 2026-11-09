import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { colors, radius, spacing } from '@/constants/theme';

export type TrendPoint = { label: string; value: number };

type TrendChartProps = {
  title: string;
  points: TrendPoint[];
  color: string;
  formatValue: (value: number) => string;
  emptyText: string;
};

const CHART_HEIGHT = 200;
const PAD_LEFT = 52;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;
const MAX_X_LABELS = 5;

export function TrendChart({ title, points, color, formatValue, emptyText }: TrendChartProps) {
  const [width, setWidth] = useState(0);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  const latest = points.length > 0 ? points[points.length - 1] : null;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {latest ? <Text style={[styles.latest, { color }]}>{formatValue(latest.value)}</Text> : null}
      </View>

      {points.length === 0 ? (
        <Text style={styles.emptyText}>{emptyText}</Text>
      ) : (
        <View onLayout={handleLayout} style={styles.chartArea}>
          {width > 0 ? <ChartSvg width={width} points={points} color={color} formatValue={formatValue} /> : null}
        </View>
      )}
    </View>
  );
}

type ChartSvgProps = {
  width: number;
  points: TrendPoint[];
  color: string;
  formatValue: (value: number) => string;
};

function ChartSvg({ width, points, color, formatValue }: ChartSvgProps) {
  const innerWidth = Math.max(1, width - PAD_LEFT - PAD_RIGHT);
  const innerHeight = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const baseY = PAD_TOP + innerHeight;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || Math.max(Math.abs(rawMax) * 0.2, 1);
  const yMin = rawMin - spread * 0.15;
  const yMax = rawMax + spread * 0.15;

  const xFor = (index: number) =>
    points.length === 1 ? PAD_LEFT + innerWidth / 2 : PAD_LEFT + (index / (points.length - 1)) * innerWidth;
  const yFor = (value: number) => PAD_TOP + (1 - (value - yMin) / (yMax - yMin)) * innerHeight;

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xFor(i).toFixed(1)},${yFor(p.value).toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${xFor(points.length - 1).toFixed(1)},${baseY} L${xFor(0).toFixed(1)},${baseY} Z`;

  const labelStep = Math.max(1, Math.ceil(points.length / MAX_X_LABELS));
  const labelIndexes = points
    .map((_, i) => i)
    .filter((i) => i % labelStep === 0 || i === points.length - 1);

  return (
    <Svg width={width} height={CHART_HEIGHT}>
      <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={PAD_TOP} y2={PAD_TOP} stroke={colors.border} strokeWidth={1} />
      <Line x1={PAD_LEFT} x2={width - PAD_RIGHT} y1={baseY} y2={baseY} stroke={colors.border} strokeWidth={1} />
      <SvgText x={PAD_LEFT - 8} y={PAD_TOP + 4} fill={colors.textMuted} fontSize={11} textAnchor="end">
        {formatValue(yMax)}
      </SvgText>
      <SvgText x={PAD_LEFT - 8} y={baseY} fill={colors.textMuted} fontSize={11} textAnchor="end">
        {formatValue(yMin)}
      </SvgText>

      <Path d={areaPath} fill={color} fillOpacity={0.12} />
      <Path d={linePath} stroke={color} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />

      {points.map((p, i) => (
        <Circle key={`${p.label}-${i}`} cx={xFor(i)} cy={yFor(p.value)} r={4} fill={color} stroke={colors.surface} strokeWidth={2} />
      ))}

      {labelIndexes.map((i) => (
        <SvgText
          key={`label-${i}`}
          x={xFor(i)}
          y={CHART_HEIGHT - 8}
          fill={colors.textMuted}
          fontSize={11}
          textAnchor={i === 0 ? 'start' : i === points.length - 1 ? 'end' : 'middle'}>
          {points[i].label}
        </SvgText>
      ))}
    </Svg>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  latest: {
    fontSize: 15,
    fontWeight: '700',
  },
  chartArea: {
    width: '100%',
    height: CHART_HEIGHT,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    paddingVertical: spacing.xs,
  },
});
