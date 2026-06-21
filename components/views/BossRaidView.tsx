"use client";

import { useMemo, useState } from "react";
import type { CardRow, FieldCard } from "../../types/game";
import { MOBILE_CARD_TOUCH_BLOCK_STYLE } from "../ui/GuardedImg";
import { CardPlaceholder } from "../ui/Card";
import { CardDetailModal } from "../ui/CardModals";
import { IconHome } from "../ui/Icons";
import { cardCategoryFlags, sortCodexCards } from "../../utils/cardUtils";
import { BS_RYEOMHWA } from "../../utils/boss/bossDefs";
import { buildMvpTestHand, initBossRaidState } from "../../utils/boss/bossRaidInit";
import {
  BOSS_RAID_SLOTS,
  type BossRaidSlot,
  type FiveSlotField,
} from "../../utils/boss/bossRaidState";

/** 시뮬 PC 필드 슬롯 (SimulationView ~18050) */
const FIELD_CARD_STYLE =
  "shrink-0 w-[108px] md:w-[128px] lg:w-[148px] aspect-[1/1.58] rounded-[8px] border border-white/20 relative z-[10] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
/** 보스 중앙 슬롯 — 동일 비율, 크기만 확대 */
const BOSS_FIELD_CARD_STYLE =
  "shrink-0 w-[140px] md:w-[165px] lg:w-[190px] aspect-[1/1.58] rounded-[8px] border-2 border-rose-500/60 relative z-[20] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
/** 면적 2배 = 선형 스케일 √2 (그리드·다른 슬롯 위치 불변) */
const BOSS_SLOT_AREA_SCALE = 1.4142135623730951;
/** 스펠 슬롯 — 유닛 슬롯과 동일 면적, 90° 회전(높이=유닛 너비, aspect 1.58/1) */
const SPELL_CARD_HORIZONTAL_STYLE =
  "shrink-0 h-[108px] md:h-[128px] lg:h-[148px] aspect-[1.58/1] rounded-[8px] border border-dashed border-slate-600/60 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
const FIELD_GRID_COLS =
  "grid shrink-0 grid-cols-[108px_108px_140px_108px_108px] md:grid-cols-[128px_128px_165px_128px_128px] lg:grid-cols-[148px_148px_190px_148px_148px] gap-x-10 lg:gap-x-12";
const UNIT_SLOT_OUTER = "relative z-0 isolate shrink-0 overflow-visible rounded-[8px]";
/** 카드가 든 슬롯 내부 (~17129) */
const CARD_INNER = "relative w-full aspect-[1/1.58] rounded-[6px] overflow-hidden bg-slate-900 pointer-events-auto";

const SLOT_LABEL: Record<BossRaidSlot, string> = {
  is2: "Is2",
  is: "Is",
  m: "M",
  os: "Os",
  os2: "Os2",
};

const CODEX_SORT_OPTIONS = [
  { value: "number_asc", label: "번호 오름차순" },
  { value: "number_desc", label: "번호 내림차순" },
  { value: "rarity_asc", label: "등급 오름차순" },
  { value: "rarity_desc", label: "등급 내림차순" },
  { value: "cost_asc", label: "코스트 오름차순" },
  { value: "cost_desc", label: "코스트 내림차순" },
] as const;

type BossRaidViewProps = {
  cards: CardRow[];
  onBackToLobby?: () => void;
};

function getFiveSlotUnit(field: FiveSlotField, slot: BossRaidSlot): FieldCard | null {
  return field[slot];
}

function fieldCardAsRow(
  card: FieldCard,
  statOverrides?: { hp?: number; atk?: number }
): CardRow {
  return {
    ...card,
    isOwned: true,
    ...(statOverrides?.hp != null ? { hp: statOverrides.hp } : {}),
    ...(statOverrides?.atk != null ? { atk: statOverrides.atk } : {}),
  };
}

function FieldSlot({
  label,
  card,
  large = false,
  variant,
  statOverrides,
}: {
  label: string;
  card: FieldCard | null;
  large?: boolean;
  variant: "enemy" | "ally";
  statOverrides?: { hp?: number; atk?: number };
}) {
  const shellClass = large ? BOSS_FIELD_CARD_STYLE : FIELD_CARD_STYLE;
  const filledBorderClass = card
    ? large
      ? "border-rose-500/60 bg-rose-950/20"
      : variant === "enemy"
        ? "border-blue-500/30 bg-blue-950/20"
        : "border-sky-500/30 bg-sky-950/20"
    : "";

  return (
    <div className={UNIT_SLOT_OUTER}>
      <div
        className={`${shellClass} ${filledBorderClass}`}
        style={
          large
            ? {
                ...MOBILE_CARD_TOUCH_BLOCK_STYLE,
                transform: `scale(${BOSS_SLOT_AREA_SCALE})`,
                transformOrigin: "center center",
              }
            : MOBILE_CARD_TOUCH_BLOCK_STYLE
        }
      >
        {card ? (
          <div className={CARD_INNER}>
            <CardPlaceholder card={fieldCardAsRow(card, statOverrides)} />
          </div>
        ) : (
          <span className="absolute -top-6 text-xs font-bold whitespace-nowrap text-slate-400">
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

function SkillCooldownGauge({
  name,
  remaining,
  max,
}: {
  name: string;
  remaining: number;
  max: number;
}) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, remaining / max)) : 0;
  return (
    <div className="w-[140px] shrink-0">
      <div className="mb-0.5 flex items-center justify-between gap-1">
        <span className="truncate text-[10px] font-bold text-slate-300">{name}</span>
        <span className="shrink-0 font-mono text-[9px] text-slate-500">
          {remaining}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full border border-slate-700 bg-slate-900 shadow-inner">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-600 to-fuchsia-500 transition-all duration-500"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function FiveSlotRow({
  field,
  variant,
  bossStatOverrides,
  bossSlotLarge = false,
  align = "end",
}: {
  field: FiveSlotField;
  variant: "enemy" | "ally";
  bossStatOverrides?: { hp?: number; atk?: number };
  bossSlotLarge?: boolean;
  align?: "start" | "end" | "center";
}) {
  const rowAlign =
    align === "end" ? "flex-end" : align === "center" ? "center" : "flex-start";
  return (
    <div
      className={FIELD_GRID_COLS}
      style={{ alignItems: rowAlign }}
    >
      {BOSS_RAID_SLOTS.map(slotKey => {
        const card = getFiveSlotUnit(field, slotKey);
        const isBossCenter = bossSlotLarge && slotKey === "m";
        const centerAllySlot = !bossSlotLarge && slotKey === "m";
        const slot = (
          <FieldSlot
            key={`${variant}-${slotKey}`}
            label={SLOT_LABEL[slotKey]}
            card={card}
            large={isBossCenter}
            variant={variant}
            statOverrides={isBossCenter ? bossStatOverrides : undefined}
          />
        );
        if (centerAllySlot) {
          return (
            <div key={`${variant}-${slotKey}-wrap`} className="flex items-end justify-center">
              {slot}
            </div>
          );
        }
        return slot;
      })}
    </div>
  );
}

function formatTurnTime(seconds: number) {
  return `00:${Math.max(0, seconds).toString().padStart(2, "0")}`;
}

export default function BossRaidView({ cards, onBackToLobby }: BossRaidViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unitSort, setUnitSort] = useState("number_asc");
  const [spellSort, setSpellSort] = useState("number_asc");
  const [detailCard, setDetailCard] = useState<CardRow | null>(null);

  const state = useMemo(
    () => initBossRaidState(BS_RYEOMHWA, cards, buildMvpTestHand(cards)),
    [cards]
  );

  const bossDef = BS_RYEOMHWA;
  const bossHpRatio =
    state.bossMaxHp > 0 ? Math.max(0, Math.min(1, state.bossHp / state.bossMaxHp)) : 0;
  const playerHpRatio =
    state.playerMaxHp > 0 ? Math.max(0, Math.min(1, state.playerHp / state.playerMaxHp)) : 0;
  const isPlayerTurn = state.phase === "player";
  const turnLabel = isPlayerTurn ? "내 턴" : "보스 턴";
  const turnColorClass = isPlayerTurn ? "text-sky-400" : "text-rose-400";

  const ownedCards = useMemo(
    () => cards.filter(c => c.isOwned !== false),
    [cards]
  );
  const unitCards = useMemo(
    () => ownedCards.filter(c => cardCategoryFlags(c).isUnit),
    [ownedCards]
  );
  const spellCards = useMemo(
    () => ownedCards.filter(c => cardCategoryFlags(c).isMagic),
    [ownedCards]
  );
  const sortedUnits = useMemo(
    () => sortCodexCards(unitCards, unitSort, false, false),
    [unitCards, unitSort]
  );
  const sortedSpells = useMemo(
    () => sortCodexCards(spellCards, spellSort, false, false),
    [spellCards, spellSort]
  );

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="relative flex aspect-video h-full w-full min-h-[750px] min-w-[1300px] max-w-[1700px] flex-col overflow-hidden rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#0a1628] to-[#050a14] p-6 text-white shadow-[0_0_50px_rgba(0,0,0,0.6)]">
        <div className="absolute left-4 top-4 z-40">
          <button
            type="button"
            onClick={() => setMenuOpen(v => !v)}
            className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-900/60 text-lg font-bold text-slate-200 shadow-lg transition hover:bg-slate-800/50"
            aria-label="메뉴"
          >
            ☰
          </button>
          {menuOpen && (
            <div className="absolute left-0 top-14 w-48 overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-xl">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onBackToLobby?.();
                }}
                className="flex w-full items-center gap-2 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                <IconHome className="h-5 w-5 shrink-0" />
                로비로 돌아가기
              </button>
            </div>
          )}
        </div>

        {/* 상단 보스 정보바 */}
        <div className="flex shrink-0 items-stretch justify-between gap-6 px-16 pt-1">
          <div className="rounded-xl border border-slate-600/50 bg-slate-900/60 p-3 shadow-md">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
              보스 스킬
            </span>
            <div className="mt-1.5 flex gap-3">
              {bossDef.skills.map(skill => (
                <SkillCooldownGauge
                  key={skill.id}
                  name={skill.name}
                  remaining={state.skillCooldowns[skill.id] ?? skill.cooldownTurns}
                  max={skill.initialCooldown ?? skill.cooldownTurns}
                />
              ))}
            </div>
          </div>

          <div className="flex w-[320px] shrink-0 flex-col justify-center rounded-xl border border-rose-500/40 bg-slate-900/60 p-3 shadow-md">
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="truncate text-base font-black text-slate-200">{bossDef.name}</h2>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-slate-300"
              >
                상세보기
              </button>
            </div>
            <div className="relative h-2.5 overflow-hidden rounded-full border border-slate-700 bg-slate-900 shadow-inner">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-red-600 to-rose-400 transition-all duration-500"
                style={{ width: `${bossHpRatio * 100}%` }}
              />
            </div>
            <div className="mt-0.5 flex justify-between font-mono text-[10px] text-slate-400">
              <span>
                HP {state.bossHp.toLocaleString()} / {state.bossMaxHp.toLocaleString()}
              </span>
              {state.bossShield > 0 && <span className="text-sky-300">실드 {state.bossShield}</span>}
            </div>
          </div>
        </div>

        {/* 메인 전투 영역 — 상대 진영만 (위쪽) */}
        <div className="flex min-h-0 flex-1 flex-col py-2">
          <div className="mx-auto w-fit shrink-0" style={{ marginTop: "-48px" }}>
            <FiveSlotRow
              field={state.bossField}
              variant="enemy"
              bossSlotLarge
              bossStatOverrides={{ hp: bossDef.hp, atk: bossDef.atk }}
              align="center"
            />
          </div>
        </div>

        {/* 하단 UI — 아군(중앙) + 컨트롤(우측) 한 줄, 드로어 위 */}
        <div className="shrink-0 pb-2">
          <div className="relative flex min-h-[200px] items-end justify-end pb-1 pt-2">
            {/* 아군 진영 + 스펠 — 중앙 (드로어 위, 약간 여유) */}
            <div className="absolute left-1/2 w-fit -translate-x-1/2" style={{ bottom: "22px" }}>
              <div className="relative">
                <div className="absolute bottom-0 right-full mr-10 lg:mr-12">
                  <div className={SPELL_CARD_HORIZONTAL_STYLE}>
                    <span className="text-[10px] font-bold text-slate-500">Spell</span>
                  </div>
                </div>
                <FiveSlotRow field={state.playerField} variant="ally" align="end" />
              </div>
            </div>

            {/* 턴 종료 / 타이머·턴 / HP·토큰 — 우측 하단 */}
            <div className="relative z-10 flex shrink-0 flex-col gap-2">
              <button
                type="button"
                disabled
                className="min-w-[280px] shrink-0 rounded-xl border-2 border-slate-700 bg-slate-800 px-4 py-3 text-sm font-black text-slate-500 opacity-50 transition-all"
              >
                내 턴 종료
              </button>

              <div className="flex min-w-[280px] items-center justify-around rounded-xl border-2 border-slate-700 bg-black/60 px-4 py-2.5 shadow-inner">
                <div className="flex flex-col items-center">
                  <span className="mb-0.5 text-[10px] font-black tracking-widest text-slate-400">TIME</span>
                  <span className="font-mono text-lg font-black tracking-widest text-sky-300">
                    {formatTurnTime(state.turnTimeLeft)}
                  </span>
                </div>
                <div className="h-10 w-px bg-slate-600" />
                <div className="flex flex-col items-center">
                  <span className="mb-0.5 text-xs font-black tracking-widest text-slate-400">
                    TURN {state.turnCount}
                  </span>
                  <span className={`text-xl font-black leading-tight ${turnColorClass}`}>{turnLabel}</span>
                </div>
              </div>

              <div
                className={`relative flex min-w-[280px] flex-col justify-center overflow-visible rounded-xl border-2 py-3 transition-colors ${
                  isPlayerTurn
                    ? "border-sky-500 bg-black/30 shadow-[0_0_15px_rgba(14,165,233,0.15)]"
                    : "border-slate-700 bg-black/30"
                }`}
              >
                <div className="pointer-events-none mb-1 flex items-center justify-between px-4">
                  <span className="text-sm font-bold text-slate-400">Player</span>
                  <span className="text-base font-black text-sky-500">{state.playerHp}</span>
                </div>
                <div className="pointer-events-none mb-2 px-4">
                  <div className="h-2.5 w-full overflow-hidden rounded-full border border-slate-700 bg-slate-900 shadow-inner">
                    <div
                      className="h-full bg-gradient-to-r from-sky-600 to-blue-400 transition-all duration-500"
                      style={{ width: `${playerHpRatio * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pointer-events-none grid grid-cols-5 gap-1.5 px-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-3.5 rounded-[3px] border transition-all duration-300 ${
                        i < state.playerTokens
                          ? "border-orange-300 bg-orange-500 shadow-[0_0_6px_rgba(249,115,22,0.6)]"
                          : "border-slate-700 bg-slate-800"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 카드 서랍 토글 — 보드 하단 패딩 안쪽 */}
        <button
          type="button"
          onClick={() => setDrawerOpen(v => !v)}
          className="mt-1 mb-1 w-full shrink-0 rounded-xl border border-slate-600 bg-slate-800/60 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-slate-700/60"
        >
          보유 카드 목록 {drawerOpen ? "닫기 ▼" : "열기 ▲"} ({ownedCards.length}장)
        </button>
        </div>

        {/* 드로어 — 보드 기준 절반 높이, 아래서 위로 슬라이드 */}
        <div
          className={`absolute inset-x-0 bottom-0 z-50 overflow-hidden rounded-t-2xl border-t-2 border-slate-600 bg-slate-950/95 backdrop-blur-sm transition-transform duration-300 ease-out ${
            drawerOpen ? "translate-y-0 pointer-events-auto" : "translate-y-full pointer-events-none"
          }`}
          style={{ height: "50%" }}
        >
          <div
            role="button"
            tabIndex={0}
            onClick={() => setDrawerOpen(false)}
            onKeyDown={e => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setDrawerOpen(false);
              }
            }}
            className="flex cursor-pointer items-center justify-between border-b border-slate-700 px-4 py-2 transition-colors hover:bg-slate-800/50"
          >
            <span className="text-sm font-bold text-slate-200">보유 카드</span>
            <span className="text-sm font-bold text-slate-400">닫기 ▼</span>
          </div>

          <div className="boss-drawer-scroll h-[calc(100%-40px)] overflow-y-auto p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-sky-300">유닛</span>
              <select
                value={unitSort}
                onChange={e => setUnitSort(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none"
              >
                {CODEX_SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mx-auto grid max-w-[85%] grid-cols-6 gap-5">
              {sortedUnits.map((card, i) => (
                <div key={card.id ?? `u-${i}`}>
                  <CardPlaceholder card={card} onOpenDetail={c => setDetailCard(c)} />
                </div>
              ))}
            </div>

            <div className="my-4 border-t border-slate-700" />

            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-bold text-fuchsia-300">스펠</span>
              <select
                value={spellSort}
                onChange={e => setSpellSort(e.target.value)}
                className="rounded-lg border border-slate-600 bg-slate-800 px-2 py-1 text-xs text-slate-200 outline-none"
              >
                {CODEX_SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="mx-auto grid max-w-[85%] grid-cols-6 gap-5">
              {sortedSpells.map((card, i) => (
                <div key={card.id ?? `s-${i}`}>
                  <CardPlaceholder card={card} onOpenDetail={c => setDetailCard(c)} />
                </div>
              ))}
            </div>
          </div>
        </div>

        <CardDetailModal card={detailCard} onClose={() => setDetailCard(null)} />
      </div>
    </div>
  );
}
