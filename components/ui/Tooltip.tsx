export function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  return <span title={text}>{children}</span>;
}
