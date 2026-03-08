export function RulesModalContent() {
  return (
    <ul className="mt-4 space-y-2 text-sm text-slate-300">
      <li>1. Roll is automatic on your turn.</li>
      <li>2. Place die in any available column on your board.</li>
      <li>3. Same value removes opponent dice in the same column.</li>
      <li>4. Duplicates in one column multiply points.</li>
      <li>5. Game ends when one board is fully filled.</li>
    </ul>
  );
}
