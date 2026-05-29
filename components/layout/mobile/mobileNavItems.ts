import type { ComponentType } from "react";
import { MainView } from "../../../types/game";
import { IconHome, IconShop, IconDeck, IconBook, IconSettings } from "../../ui/Icons";

export const mobileNavItems: { view: MainView; label: string; Icon: ComponentType<{ className?: string }> }[] = [
  { view: "battle", label: "대전 센터", Icon: IconHome },
  { view: "shop", label: "상점/뽑기", Icon: IconShop },
  { view: "deck", label: "덱 구성", Icon: IconDeck },
  { view: "codex", label: "카드 도감", Icon: IconBook },
  { view: "settings", label: "환경 설정", Icon: IconSettings },
];
