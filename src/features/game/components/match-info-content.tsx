type MatchInfoContentProps = {
  status: string;
  phase: string;
  inputState: string;
};

export function MatchInfoContent({ status, phase, inputState }: MatchInfoContentProps) {
  return (
    <div className="mt-4 space-y-2 text-sm text-slate-300">
      <p>
        Status: <span className="font-semibold text-slate-100">{status}</span>
      </p>
      <p>
        Phase: <span className="font-semibold text-slate-100">{phase}</span>
      </p>
      <p>
        Input: <span className="font-semibold text-slate-100">{inputState}</span>
      </p>
    </div>
  );
}
