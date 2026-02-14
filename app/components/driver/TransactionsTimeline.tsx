import { ContractTransaction } from "@/app/types";
import { formatDate } from "@/app/lib/format";

interface TransactionsTimelineProps {
  transactions: ContractTransaction[];
  teamColor: string;
}

export default function TransactionsTimeline({
  transactions,
  teamColor,
}: TransactionsTimelineProps) {
  if (!transactions.length) return null;

  return (
    <div>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">
        Transactions
      </h3>
      <div className="relative border-l border-white/10 ml-2 space-y-3 pl-4">
        {transactions.map((tx, i) => (
          <div key={i} className="relative">
            <div
              className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full"
              style={{
                backgroundColor: i === 0 ? teamColor : "rgba(255,255,255,0.2)",
              }}
            />
            <p className="text-xs font-medium text-white/40">{formatDate(tx.date)}</p>
            <p className="text-sm text-white/70 leading-relaxed">{tx.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
