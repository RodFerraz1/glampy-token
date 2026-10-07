export function Indicador({ rotulo, children, nota }: { rotulo: string; children: React.ReactNode; nota?: string }) {
  return (
    <div className="min-w-0 rounded-lg bg-creme p-4">
      <dt className="text-sm text-cinza">{rotulo}</dt>
      <dd className="mt-1 text-2xl font-semibold">{children}</dd>
      {nota && <dd className="mt-1 text-sm text-cinza">{nota}</dd>}
    </div>
  );
}
