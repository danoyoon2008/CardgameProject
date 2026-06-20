"use client";

import { useMemo, useState } from "react";
import type { CardRow, FieldCard } from "../../types/game";
import { GuardedImg, MOBILE_CARD_TOUCH_BLOCK_STYLE } from "../ui/GuardedImg";
import { BS_RYEOMHWA, resolveBossImageUrl } from "../../utils/boss/bossDefs";
import { buildMvpTestHand, initBossRaidState } from "../../utils/boss/bossRaidInit";
import {
  BOSS_RAID_SLOTS,
  type BossRaidSlot,
  type FiveSlotField,
} from "../../utils/boss/bossRaidState";

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

function FieldSlot({
  label,
  card,
  imageUrl,
  large = false,
  variant,
}: {
  label: string;
  card: FieldCard | null;
  imageUrl?: string | null;
  large?: boolean;
  variant: "enemy" | "ally";
}) {
  const width = large ? 132 : 92;
  const height = large ? 184 : 128;
  const border =
    variant === "enemy"
      ? "border-rose-400/40 bg-rose-950/20"
      : "border-sky-400/40 bg-sky-950/20";
  const src = imageUrl ?? card?.image_url;

  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      <div
        className={`relative overflow-hidden rounded-xl border-2 ${border} shadow-inner`}
        style={{ width, height, ...MOBILE_CARD_TOUCH_BLOCK_STYLE }}
      >
        {card && src ? (
          <GuardedImg src={src} alt={card.name} className="h-full w-full object-cover" />
        ) : card ? (
          <div className="flex h-full w-full items-center justify-center p-2 text-center text-xs font-bold text-slate-300">
            {card.name}
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-slate-600">—</div>
        )}
      </div>
      {card && (
        <span className="max-w-[92px] truncate text-[10px] font-semibold text-slate-400">
          {card.currentHp ?? card.hp}/{card.hp ?? "?"}
        </span>
      )}
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
    <div className="min-w-[120px]">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-bold text-amber-200">{name}</span>
        <span className="shrink-0 text-[10px] font-mono text-slate-400">
          {remaining}/{max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800 ring-1 ring-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function FiveSlotRow({
  field,
  variant,
  bossImageUrl,
  bossSlotLarge = false,
}: {
  field: FiveSlotField;
  variant: "enemy" | "ally";
  bossImageUrl?: string | null;
  bossSlotLarge?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end justify-center gap-2 sm:gap-3">
      {BOSS_RAID_SLOTS.map(slotKey => {
        const card = getFiveSlotUnit(field, slotKey);
        const isBossCenter = bossSlotLarge && slotKey === "m";
        return (
          <FieldSlot
            key={`${variant}-${slotKey}`}
            label={SLOT_LABEL[slotKey]}
            card={card}
            imageUrl={isBossCenter ? bossImageUrl : undefined}
            large={isBossCenter}
            variant={variant}
          />
        );
      })}
    </div>
  );
}

export default function BossRaidView({ cards, onBackToLobby }: BossRaidViewProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const state = useMemo(
    () => initBossRaidState(BS_RYEOMHWA, cards, buildMvpTestHand(cards)),
    [cards]
  );

  const bossDef = BS_RYEOMHWA;
  const bossImageUrl = resolveBossImageUrl(bossDef, cards);
  const hpRatio = state.bossMaxHp > 0 ? Math.max(0, Math.min(1, state.bossHp / state.bossMaxHp)) : 0;

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col bg-gradient-to-b from-[#0a1628] via-[#0d1f3c] to-[#050a14] text-white">
      {/* 좌상단: 메뉴 */}
      <button
        type="button"
        onClick={() => onBackToLobby?.()}
        className="absolute left-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-black/40 text-lg font-bold text-slate-200 backdrop-blur-sm transition hover:bg-white/10"
        title="로비로"
      >
        ☰
      </button>

      {/* 상단 정보바 */}
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-4 border-b border-white/10 px-4 pb-3 pt-14 sm:px-6">
        <div className="flex flex-col gap-2 pl-12 sm:pl-0">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">보스 스킬</span>
          <div className="flex flex-wrap gap-3">
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

        <div className="min-w-[200px] flex-1 sm:max-w-md">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="truncate text-lg font-black text-rose-200">{bossDef.name}</h2>
            <button
              type="button"
              className="shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-300"
            >
              상세보기
            </button>
          </div>
          <div className="relative h-4 overflow-hidden rounded-full bg-slate-900 ring-1 ring-rose-500/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-rose-600 to-orange-500"
              style={{ width: `${hpRatio * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[11px] font-mono text-slate-400">
            <span>
              HP {state.bossHp.toLocaleString()} / {state.bossMaxHp.toLocaleString()}
            </span>
            {state.bossShield > 0 && <span className="text-sky-300">실드 {state.bossShield}</span>}
          </div>
        </div>
      </div>

      {/* 필드 본문 */}
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-3 py-4 sm:gap-6 sm:px-6">
        <div className="w-full max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-rose-400/80">
            상대 진영
          </p>
          <FiveSlotRow
            field={state.bossField}
            variant="enemy"
            bossImageUrl={bossImageUrl}
            bossSlotLarge
          />
        </div>

        {/* 중앙 스펠 슬롯 */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400/80">Spell</span>
          <div
            className="flex h-16 w-28 items-center justify-center rounded-xl border-2 border-dashed border-violet-500/35 bg-violet-950/15 text-xs text-slate-500"
            style={MOBILE_CARD_TOUCH_BLOCK_STYLE}
          >
            스펠 칸
          </div>
        </div>

        <div className="w-full max-w-3xl">
          <p className="mb-2 text-center text-[11px] font-bold uppercase tracking-widest text-sky-400/80">
            아군 진영
          </p>
          <FiveSlotRow field={state.playerField} variant="ally" />
        </div>
      </div>

      {/* 하단: 턴 / 타이머·자원 */}
      <div className="flex shrink-0 items-center justify-between gap-4 border-t border-white/10 px-4 py-3 sm:px-6">
        <button
          type="button"
          disabled
          className="rounded-xl border-2 border-orange-500/40 bg-orange-600/20 px-5 py-2.5 text-sm font-black text-orange-200 opacity-60"
        >
          턴 넘기기
        </button>
        <div className="flex flex-col items-end gap-1 text-right">
          <span className="font-mono text-sm font-bold text-slate-300">00:60</span>
          <div className="flex gap-3 text-[11px] font-semibold text-slate-400">
            <span>토큰 —</span>
            <span>HP 2000</span>
          </div>
        </div>
      </div>

      {/* 최하단: 카드 서랍 */}
      <div className="shrink-0 border-t border-white/10 px-4 py-3 sm:px-6">
        <button
          type="button"
          onClick={() => setDrawerOpen(v => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-950/30 py-3 text-sm font-bold text-sky-200 transition hover:bg-sky-900/40"
        >
          카드 서랍 ({state.playerHand.length}장)
          <span className="text-xs text-slate-500">{drawerOpen ? "▲" : "▼"}</span>
        </button>
        {drawerOpen && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-2">
            {state.playerHand.map((card, idx) => (
              <div
                key={card.statsInstanceId ?? `${card.name}-${idx}`}
                className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-lg border border-white/15 bg-slate-900"
                style={MOBILE_CARD_TOUCH_BLOCK_STYLE}
              >
                {card.image_url ? (
                  <GuardedImg src={card.image_url} alt={card.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center p-1 text-center text-[9px] font-bold text-slate-400">
                    {card.name}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
