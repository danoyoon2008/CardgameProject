"use client";

import { useMemo, useState } from "react";
import type { CardRow, FieldCard } from "../../types/game";
import { MOBILE_CARD_TOUCH_BLOCK_STYLE } from "../ui/GuardedImg";
import { CardPlaceholder } from "../ui/Card";
import { IconHome } from "../ui/Icons";
import { BS_RYEOMHWA } from "../../utils/boss/bossDefs";
import { buildMvpTestHand, initBossRaidState } from "../../utils/boss/bossRaidInit";
import {
  BOSS_RAID_SLOTS,
  type BossRaidSlot,
  type FiveSlotField,
} from "../../utils/boss/bossRaidState";

/** 시뮬 PC 필드 슬롯 (SimulationView ~18050) */
const FIELD_CARD_STYLE =
  "shrink-0 w-[80px] md:w-[95px] lg:w-[110px] aspect-[1/1.58] rounded-[8px] border border-white/20 relative z-[10] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
/** 보스 중앙 슬롯 — 동일 비율, 크기만 확대 */
const BOSS_FIELD_CARD_STYLE =
  "shrink-0 w-[110px] md:w-[130px] lg:w-[155px] aspect-[1/1.58] rounded-[8px] border-2 border-rose-500/60 relative z-[10] flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
/** 시뮬 PC 스펠 슬롯 (~18051) */
const SPELL_CARD_STYLE =
  "shrink-0 w-[130px] md:w-[155px] lg:w-[190px] aspect-[1.58/1] rounded-[8px] border border-white/20 relative flex items-center justify-center shadow-lg bg-black/40 overflow-hidden transition-colors";
const UNIT_SLOT_OUTER = "relative z-0 isolate shrink-0 overflow-visible rounded-[8px]";
/** 카드가 든 슬롯 내부 (~17129) */
const CARD_INNER = "relative w-full aspect-[1/1.58] rounded-[6px] overflow-hidden bg-slate-900 pointer-events-auto";
const HAND_SLOT_OUTER = "shrink-0 w-[85px] md:w-[110px] lg:w-[135px] relative overflow-visible";
const HAND_CARD_STYLE =
  "w-full aspect-[1/1.58] rounded-[8px] border border-white/10 flex items-center justify-center transition-all shadow-md bg-black/30 relative overflow-visible";
const HAND_CARD_FACE =
  "absolute inset-0 z-[2] overflow-hidden rounded-[8px] flex items-center justify-center";

const SLOT_LABEL: Record<BossRaidSlot, string> = {
  is2: "Is2",
  is: "Is",
  m: "M",
  os: "Os",
  os2: "Os2",
};

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
        style={MOBILE_CARD_TOUCH_BLOCK_STYLE}
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
  align?: "start" | "end";
}) {
  return (
    <div
      className="flex shrink-0 justify-center gap-8 lg:gap-10"
      style={{ alignItems: align === "end" ? "flex-end" : "flex-start" }}
    >
      {BOSS_RAID_SLOTS.map(slotKey => {
        const card = getFiveSlotUnit(field, slotKey);
        const isBossCenter = bossSlotLarge && slotKey === "m";
        return (
          <FieldSlot
            key={`${variant}-${slotKey}`}
            label={SLOT_LABEL[slotKey]}
            card={card}
            large={isBossCenter}
            variant={variant}
            statOverrides={isBossCenter ? bossStatOverrides : undefined}
          />
        );
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

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 p-4">
      <div className="relative flex aspect-video w-full min-h-[750px] min-w-[1300px] max-w-[1700px] flex-col gap-2 overflow-hidden rounded-3xl border-2 border-slate-800 bg-gradient-to-b from-[#0a1628] to-[#050a14] p-6 text-white shadow-[0_0_50px_rgba(0,0,0,0.6)]">
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

        {/* 상대 진영 5칸 */}
        <div className="flex shrink-0 flex-col items-center gap-2 pt-2">
          <FiveSlotRow
            field={state.bossField}
            variant="enemy"
            bossSlotLarge
            bossStatOverrides={{ hp: bossDef.hp, atk: bossDef.atk }}
            align="end"
          />
        </div>

        {/* 중앙 스펠 슬롯 */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className={`${SPELL_CARD_STYLE} border-dashed border-slate-600/60`}>
            <span className="text-[10px] font-bold text-slate-500">Spell</span>
          </div>
        </div>

        {/* 아군 진영 5칸 */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-start gap-2">
          <FiveSlotRow field={state.playerField} variant="ally" align="start" />
        </div>

        {/* 하단: 턴 넘기기 / 타이머 / HP·토큰 (시뮬 PC 컨트롤 패널 패턴) */}
        <div className="mt-auto flex shrink-0 items-stretch justify-between gap-4 border-t border-white/10 pt-3">
          <button
            type="button"
            disabled
            className="h-[130px] w-[130px] shrink-0 rounded-xl border-2 border-slate-700 bg-slate-800 px-4 text-sm font-black text-slate-500 opacity-50 transition-all"
          >
            내 턴
            <br />
            종료
          </button>

          <div className="flex flex-row items-stretch justify-end gap-4">
            {/* 타이머 박스 (토큰 왼쪽) */}
            <div className="flex w-[100px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-black/60 p-3 shadow-inner">
              <span className="mb-1 text-[10px] font-black tracking-widest text-slate-400">TIME</span>
              <span className="font-mono text-lg font-black tracking-widest text-sky-300">
                {formatTurnTime(state.turnTimeLeft)}
              </span>
            </div>

            {/* 턴 박스 */}
            <div className="flex w-[130px] shrink-0 flex-col items-center justify-center rounded-xl border-2 border-slate-700 bg-black/60 p-3 shadow-inner">
              <span className="mb-1 text-xs font-black tracking-widest text-slate-400">
                TURN {state.turnCount}
              </span>
              <span className={`text-xl font-black leading-tight ${turnColorClass}`}>{turnLabel}</span>
            </div>

            {/* 플레이어 HP + 토큰 (시뮬 Player A 패널) */}
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

        {/* 카드 서랍 */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={() => setDrawerOpen(v => !v)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-black/30 py-2 text-xs font-bold text-slate-300 transition hover:bg-slate-800/40"
          >
            보유 카드 목록 열기 {drawerOpen ? "▲" : "▼"}
            <span className="text-[10px] font-normal text-slate-500">({state.playerHand.length}장)</span>
          </button>
          {drawerOpen && (
            <div
              className={`mt-2 flex items-center justify-center gap-2 overflow-x-auto px-2 pb-1 ${
                isPlayerTurn
                  ? "rounded-2xl border border-sky-500/60 bg-sky-950/30 py-3 shadow-[inset_0_0_30px_rgba(14,165,233,0.15)]"
                  : "rounded-2xl border border-slate-700/50 bg-black/20 py-3"
              }`}
            >
              {state.playerHand.map((card, idx) => (
                <div key={card.statsInstanceId ?? `${card.name}-${idx}`} className={HAND_SLOT_OUTER}>
                  <div className={`${HAND_CARD_STYLE} border-sky-400/50`}>
                    <div className={HAND_CARD_FACE}>
                      <CardPlaceholder card={fieldCardAsRow(card)} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
