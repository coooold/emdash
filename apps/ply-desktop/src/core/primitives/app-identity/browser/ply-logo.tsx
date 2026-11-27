export const NATURAL_WIDTH = 240;
export const NATURAL_HEIGHT = 70;

export const PLY_MARK_PATH = 'M23.235 23.2454H103.519L80.2841 51.1252H0L23.235 23.2454Z';

export function PlyLogo({
  className,
  height = NATURAL_HEIGHT,
  color = 'currentColor',
}: {
  className?: string;
  height?: number;
  color?: string;
}) {
  const width = (height / NATURAL_HEIGHT) * NATURAL_WIDTH;

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 240 70"
      fill={color}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={PLY_MARK_PATH} />
      <text x="119" y="52" fontFamily="system-ui, sans-serif" fontSize="54" fontWeight="700">
        ply
      </text>
    </svg>
  );
}
