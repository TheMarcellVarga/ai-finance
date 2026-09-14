type WorkspaceWaveAccentProps = {
  className?: string;
};

const wavePaths = [
  {
    d: "M-12 58 C 38 28, 74 82, 126 53 S 218 23, 334 56",
    className: "workspace-wave-accent-primary",
  },
  {
    d: "M-12 68 C 42 40, 78 91, 132 62 S 228 33, 334 67",
    className: "workspace-wave-accent-secondary",
  },
  {
    d: "M-12 47 C 34 20, 76 67, 128 42 S 224 17, 334 45",
    className: "workspace-wave-accent-tertiary",
  },
  {
    d: "M-12 79 C 42 52, 78 100, 138 73 S 236 46, 334 78",
    className: "workspace-wave-accent-far",
  },
];

export function WorkspaceWaveAccent({ className = "" }: WorkspaceWaveAccentProps) {
  return (
    <svg
      className={`workspace-wave-accent ${className}`}
      viewBox="0 0 320 110"
      fill="none"
      aria-hidden="true"
      focusable="false"
      preserveAspectRatio="none"
    >
      {wavePaths.map(({ d, className: pathClass }) => (
        <path key={pathClass} d={d} className={pathClass} />
      ))}
    </svg>
  );
}
