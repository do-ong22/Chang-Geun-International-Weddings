import { NavBar } from "@/components/ui";
import { Ledger } from "./ledger";

export default function BudgetPage() {
  return (
    <main>
      <NavBar title="비용 장부" />
      <Ledger />
    </main>
  );
}
