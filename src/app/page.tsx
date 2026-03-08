import { MenuActionButton } from "@/components/home/menu-action-button";
import { MenuCard } from "@/components/home/menu-card";

export default function Home() {
  return (
    <MenuCard
      title="Knucklebones"
      description="Browser-based dice duel inspired by Cult of the Lamb. Choose a mode and start playing."
    >
      <MenuActionButton href="/game">New game with bot</MenuActionButton>
      <MenuActionButton href="/settings">Settings</MenuActionButton>
    </MenuCard>
  );
}
