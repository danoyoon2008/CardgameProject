/**
 * No.37 애벌레킹 — 기생형 라이더(W 슬롯) 전용 유틸.
 *
 * 사양 요약
 * - 손패에서 적의 점유된 유닛 슬롯(is/m/os) 위에 드롭 시 host에 부착(parasiteRider).
 *   빈 슬롯/아군 슬롯/이미 부착된 host에는 부착 불가.
 * - 공격 버튼 없음. 매 턴 종료(누구의 턴이든) 시 host에게 자동 AEBEOLAEKING_PARASITE_TURN_END_DAMAGE 피해.
 *   부착한 그 턴의 종료부터 발동(부착 turn-end 포함).
 * - host 사망 시 동반 리와인드(host·rider 각각 별개 카드로 rewindCards에 push).
 * - 데미지 공유 시스템: 외부에서 host가 피해를 받으면 50%가 rider에게, rider가 피해를 받으면 50%가 host에게.
 *   단, 매 턴 자동 300 피해(자기 패시브)는 공유 시스템에서 제외.
 */

import type { CardRow, FieldCard, SimulationPlayerField } from "../../../types/game";
import { UNIT } from "../unitIds";
import { spellStackHasActiveBangEomak } from "../spells/bangeomak";
import { spellStackHasActiveCheolbyeok } from "../spells/cheolbyeok";
import { isBaekseuInvulnerable } from "../units/baekseu";
import { isSuppressionActive } from "../debuffs/suppression";

/**
 * 방어막(W 진영 spell stack 활성 시) 데미지 감소 — 일반 유닛 룰과 동일(−200, 최소 100).
 * - W는 일반 유닛처럼 spell 효과를 받는 카드이므로 [제압]·외부 버프 차단 룰도 동일 적용.
 */
function reduceDamageByRiderSideBangEomak(
  rider: FieldCard,
  damage: number,
  riderSideField: SimulationPlayerField
): number {
  if (damage <= 0) return 0;
  if (!spellStackHasActiveBangEomak(riderSideField)) return damage;
  /* [제압] 등 외부 버프 차단 디버프가 W에 걸려 있으면 방어막도 무시 — 일반 유닛 룰과 동일 */
  if (isSuppressionActive(rider)) return damage;
  return Math.max(100, damage - 200);
}

/** W가 [무적] 판정인지(백스/철벽 — W 자신 진영의 cheolbyeok 활성). [제압] 시는 무적 해제 룰 동일. */
function isAebeolaekingRiderInvulnerable(
  rider: FieldCard,
  riderSideField: SimulationPlayerField
): boolean {
  if ((rider.currentHp ?? 0) <= 0) return false;
  if (isBaekseuInvulnerable(rider)) return true;
  if (isSuppressionActive(rider)) return false;
  return spellStackHasActiveCheolbyeok(riderSideField);
}

/**
 * W의 보호막(오리에트의 초상 — hpBarrierAbsorptionRemaining)을 먼저 흡수한 뒤 남은 데미지를 반환.
 * - 보호막은 흡수 후 남은 잔량을 새 rider 객체로 갱신해 반환.
 */
function absorbRiderBarrier(
  rider: FieldCard,
  damage: number
): { riderAfter: FieldCard; damageAfter: number; absorbedByBarrier: number } {
  const barrier = rider.hpBarrierAbsorptionRemaining ?? 0;
  if (barrier <= 0 || damage <= 0) {
    return { riderAfter: rider, damageAfter: Math.max(0, damage), absorbedByBarrier: 0 };
  }
  const absorbed = Math.min(barrier, damage);
  const nextBarrier = barrier - absorbed;
  const riderAfter: FieldCard = {
    ...rider,
    hpBarrierAbsorptionRemaining: nextBarrier > 0 ? nextBarrier : undefined,
  };
  return { riderAfter, damageAfter: Math.max(0, damage - absorbed), absorbedByBarrier: absorbed };
}

export const AEBEOLAEKING_ID = UNIT.AEBEOLAEKING;

/** 매 턴 종료 시 host에게 들어가는 자동 피해량. */
export const AEBEOLAEKING_PARASITE_TURN_END_DAMAGE = 300 as const;

/** 데미지 공유 비율 — host↔rider 50%. floor 후 최소 1. */
export const AEBEOLAEKING_DAMAGE_SHARE_RATIO = 0.5 as const;

/** host의 유닛 슬롯 키 — W는 별도 슬롯이 아니라 host의 속성. */
export type AebeolaekingHostSlot = "is" | "m" | "os";

export function isAebeolaekingCard(card: CardRow | FieldCard | null | undefined): boolean {
  return !!card && card.name === AEBEOLAEKING_ID;
}

export function hasAebeolaekingRider(host: FieldCard | null | undefined): boolean {
  if (!host) return false;
  const rider = host.parasiteRider;
  return !!rider && isAebeolaekingCard(rider);
}

/**
 * host에서 rider 메타(parasiteSummonGlobalTurn·parasiteHostPlayer)를 제거한 rider 사본을 반환.
 * rewindCards에 push하기 전 사용.
 */
export function stripAebeolaekingRiderMeta(rider: FieldCard): FieldCard {
  const next: FieldCard = { ...rider };
  delete (next as { parasiteSummonGlobalTurn?: number }).parasiteSummonGlobalTurn;
  delete (next as { parasiteHostPlayer?: "A" | "B" | null }).parasiteHostPlayer;
  return next;
}

/**
 * host에서 rider를 분리한 새 host와 분리된 rider(메타 미제거)를 반환.
 * - host에 rider가 없으면 strippedHost=host(불변), rider=null.
 */
export function detachAebeolaekingRiderFromHost(host: FieldCard): {
  strippedHost: FieldCard;
  rider: FieldCard | null;
} {
  if (!hasAebeolaekingRider(host)) return { strippedHost: host, rider: null };
  const rider = host.parasiteRider!;
  const strippedHost: FieldCard = { ...host, parasiteRider: null };
  return { strippedHost, rider };
}

/**
 * 새 rider 생성 — 손패에서 부착될 때 1회 호출.
 * - currentHp는 hp 원본(없으면 0)으로 초기화.
 * - hasAttacked=true(공격 없음 표시), hasBeenAttackedThisTurn=false.
 * - statsInstanceId는 호출자가 생성(또는 미부여 — W는 unitCombatStats에 등재 안 함).
 */
export function buildAebeolaekingRider(
  sourceRow: CardRow,
  opts: {
    hostPlayer: "A" | "B";
    summonGlobalTurn: number;
    statsInstanceId?: string;
    summonedTurn: string;
  }
): FieldCard {
  const baseHp = Number(sourceRow.hp) || 0;
  return {
    ...sourceRow,
    statsInstanceId: opts.statsInstanceId,
    currentHp: baseHp,
    hasAttacked: true,
    hasBeenAttackedThisTurn: false,
    summonedTurn: opts.summonedTurn,
    parasiteSummonGlobalTurn: opts.summonGlobalTurn,
    parasiteHostPlayer: opts.hostPlayer,
  };
}

/**
 * host에 새 rider를 부착한 새 host 반환.
 * - 기존 rider가 있으면 덮어쓰지 않고 host를 그대로 반환(이미 부착됨).
 */
export function attachAebeolaekingRider(host: FieldCard, rider: FieldCard): FieldCard {
  if (hasAebeolaekingRider(host)) return host;
  return { ...host, parasiteRider: rider };
}

/**
 * host에 부착된 rider가 이번 턴 종료에 자동 피해를 발동할 자격인지.
 * - 사양: "배치 후 턴을 넘긴 시점부터" → 부착한 그 턴의 종료부터 발동(부착 turn-end 포함).
 * - parasiteSummonGlobalTurn에 부착 직전 prev.globalTurnCount가 저장되고,
 *   같은 턴이 끝날 때 handleEndTurn은 prev.globalTurnCount === parasiteSummonGlobalTurn 상태로 호출되므로 `>=` 비교가 맞다.
 */
export function shouldTriggerAebeolaekingParasiteThisEndTurn(
  rider: FieldCard | null | undefined,
  currentGlobalTurn: number
): boolean {
  if (!rider || !isAebeolaekingCard(rider)) return false;
  const since = rider.parasiteSummonGlobalTurn;
  if (since == null) return true;
  return currentGlobalTurn >= since;
}

/**
 * host에 부착된 rider에게만 직접 damage를 적용. host는 영향 없음(공유는 별도 헬퍼).
 * - rider 사망 시 host에서 분리되고 분리된 rider(메타 미제거)를 함께 반환.
 * - rider가 없거나 애벌레킹이 아니면 host를 그대로 반환.
 */
export function applyDamageToAebeolaekingRiderInHost(
  host: FieldCard,
  damageToRider: number
): { updatedHost: FieldCard; deadRider: FieldCard | null } {
  if (damageToRider <= 0) return { updatedHost: host, deadRider: null };
  if (!hasAebeolaekingRider(host)) return { updatedHost: host, deadRider: null };
  const rider = host.parasiteRider!;
  const newRiderHp = Math.max(0, (rider.currentHp ?? 0) - damageToRider);
  if (newRiderHp <= 0) {
    return {
      updatedHost: { ...host, parasiteRider: null },
      deadRider: { ...rider, currentHp: 0 },
    };
  }
  return {
    updatedHost: { ...host, parasiteRider: { ...rider, currentHp: newRiderHp } },
    deadRider: null,
  };
}

/**
 * host의 매 턴 종료 자동 피해 적용. rider 사망(자해)은 불가 — host에만 피해, rider는 미해.
 * - 사양: rider의 자기 능력(300)이므로 데미지 공유 시스템 적용 X.
 * - 반환: 적용 후 host(또는 host 사망 시 currentHp 0 host와 deadHost=true).
 */
export function applyAebeolaekingParasiteEndTurnDamageToHost(host: FieldCard): {
  updatedHost: FieldCard;
  hostDied: boolean;
  damageDealt: number;
} {
  if (!hasAebeolaekingRider(host)) return { updatedHost: host, hostDied: false, damageDealt: 0 };
  const before = host.currentHp ?? 0;
  if (before <= 0) return { updatedHost: host, hostDied: true, damageDealt: 0 };
  const after = Math.max(0, before - AEBEOLAEKING_PARASITE_TURN_END_DAMAGE);
  return {
    updatedHost: { ...host, currentHp: after },
    hostDied: after <= 0,
    damageDealt: before - after,
  };
}

/**
 * host가 죽었을 때 rewindCards에 host+rider를 별개 카드로 push.
 * - host의 parasiteRider는 제거된 host 사본을 push.
 * - rider가 있었다면 메타 제거 후 별개 카드로 push.
 * - rider가 없으면 host만 push.
 */
export function appendDeadHostWithRiderToRewindCards(
  rewindCards: CardRow[],
  deadHost: FieldCard
): CardRow[] {
  if (!hasAebeolaekingRider(deadHost)) {
    return [...rewindCards, deadHost];
  }
  const rider = deadHost.parasiteRider!;
  const hostWithoutRider: FieldCard = { ...deadHost, parasiteRider: null };
  const riderStripped = stripAebeolaekingRiderMeta(rider);
  return [...rewindCards, hostWithoutRider, riderStripped];
}

/**
 * W 라이더 슬롯 키 — host의 진영·슬롯에서 파생된 "A-w-is" 등.
 * VFX·attack target 식별·data 속성·save에 사용.
 */
export function aebeolaekingRiderSlotKey(
  ownerPlayer: "A" | "B",
  hostSlot: AebeolaekingHostSlot
): string {
  return `${ownerPlayer}-w-${hostSlot}`;
}

export function isAebeolaekingRiderSlotKey(key: string | null | undefined): boolean {
  if (!key) return false;
  const parts = key.split("-");
  if (parts.length !== 3) return false;
  if (parts[0] !== "A" && parts[0] !== "B") return false;
  if (parts[1] !== "w") return false;
  return parts[2] === "is" || parts[2] === "m" || parts[2] === "os";
}

export function parseAebeolaekingRiderSlotKey(
  key: string | null | undefined
): { ownerPlayer: "A" | "B"; hostSlot: AebeolaekingHostSlot } | null {
  if (!isAebeolaekingRiderSlotKey(key)) return null;
  const parts = (key as string).split("-");
  return {
    ownerPlayer: parts[0] as "A" | "B",
    hostSlot: parts[2] as AebeolaekingHostSlot,
  };
}

/**
 * 손패 드래그로 W를 host에 부착할 수 있는지 검증(commit 전 hover/UI에서도 호출).
 * - ok=false면 reason에 사유.
 * - 시전자 자신의 진영(slot owner = caster)에는 부착 불가.
 * - 빈 슬롯에는 부착 불가.
 * - 이미 부착된 host에는 추가 부착 불가.
 * - host가 사망 상태(currentHp ≤ 0)면 불가.
 */
export function canHandDragAttachAebeolaekingTo(
  casterPlayer: "A" | "B",
  targetPlayer: "A" | "B",
  hostUnit: FieldCard | null | undefined
): { ok: boolean; reason?: string } {
  if (casterPlayer === targetPlayer) return { ok: false, reason: "적 유닛 위에 놓아 주세요" };
  if (!hostUnit || (hostUnit.currentHp ?? 0) <= 0) {
    return { ok: false, reason: "적 유닛 위에 놓아 주세요" };
  }
  if (hasAebeolaekingRider(hostUnit)) {
    return { ok: false, reason: "이미 애벌레킹이 기생 중입니다" };
  }
  return { ok: true };
}

/** 공격 버튼·기본 공격 흐름에서 W가 공격을 절대로 수행하지 않도록 막는 술어. */
export function isAebeolaekingNoAttackUnit(card: CardRow | FieldCard | null | undefined): boolean {
  return isAebeolaekingCard(card);
}

/**
 * W의 진정한 소유자(시전자) — host의 반대편.
 * - host에 부착된 rider의 parasiteHostPlayer가 host의 진영을 가리키므로 그 반대편이 W의 진정한 진영.
 * - rider가 없거나 parasiteHostPlayer가 비어 있으면 null.
 * - 광역 자기 지원 스펠(방어막·집중 사격·휴게소의 안식·철벽)과 데미지 공유 시 W 진영 spell stack 결정에 사용.
 */
export function getAebeolaekingRiderOwnerFromHostOwner(hostOwner: "A" | "B"): "A" | "B" {
  return hostOwner === "A" ? "B" : "A";
}

export function getAebeolaekingRiderTrueOwner(rider: FieldCard | null | undefined): "A" | "B" | null {
  if (!rider || !isAebeolaekingCard(rider)) return null;
  const host = rider.parasiteHostPlayer;
  if (host === "A") return "B";
  if (host === "B") return "A";
  return null;
}

/**
 * host가 피해를 받은 직후, rider에게 50% 공유 피해를 적용.
 * - rider가 없으면 no-op.
 * - rider 사망 시 host에서 분리, deadRider 반환.
 * - sharedToRider는 실제로 rider에게 적용된 피해(floor·최소 1).
 * - 보호 무시 — 호환성용. 광역 자기 지원 통합 후에는 WithProtection을 사용.
 */
export function applyAebeolaekingDamageShareFromHostToRider(
  host: FieldCard,
  hostDamageReceived: number
): { updatedHost: FieldCard; deadRider: FieldCard | null; sharedToRider: number } {
  if (hostDamageReceived <= 0) return { updatedHost: host, deadRider: null, sharedToRider: 0 };
  if (!hasAebeolaekingRider(host)) return { updatedHost: host, deadRider: null, sharedToRider: 0 };
  const share = Math.max(1, Math.floor(hostDamageReceived * AEBEOLAEKING_DAMAGE_SHARE_RATIO));
  const result = applyDamageToAebeolaekingRiderInHost(host, share);
  return {
    updatedHost: result.updatedHost,
    deadRider: result.deadRider,
    sharedToRider: share,
  };
}

/**
 * host→rider 공유 데미지 적용 — rider 진영(host 반대편) 광역 자기 지원 스펠을 통과·차단.
 * 처리 순서:
 *  1. rider의 [무적](백스 또는 W 진영 spell stack 철벽 활성) → 데미지 0.
 *  2. rider 진영 spell stack 방어막 → −200(최소 100), [제압] 시 미적용.
 *  3. rider 보호막(hpBarrierAbsorptionRemaining, 오리에트의 초상) → 흡수.
 *  4. 잔여 데미지를 rider hp에서 차감.
 * - 반환: 갱신된 host(보호막 잔량 포함 rider 또는 분리된 host), 사망한 rider, 실제 적용 데미지.
 */
export function applyAebeolaekingDamageShareFromHostToRiderWithProtection(
  host: FieldCard,
  hostDamageReceived: number,
  ctx: {
    hostOwner: "A" | "B";
    playerAField: SimulationPlayerField;
    playerBField: SimulationPlayerField;
  }
): {
  updatedHost: FieldCard;
  deadRider: FieldCard | null;
  sharedToRider: number;
  blocked: "invuln" | null;
  absorbedByBarrier: number;
} {
  if (hostDamageReceived <= 0) {
    return { updatedHost: host, deadRider: null, sharedToRider: 0, blocked: null, absorbedByBarrier: 0 };
  }
  if (!hasAebeolaekingRider(host)) {
    return { updatedHost: host, deadRider: null, sharedToRider: 0, blocked: null, absorbedByBarrier: 0 };
  }
  const rider = host.parasiteRider!;
  const riderOwner = getAebeolaekingRiderOwnerFromHostOwner(ctx.hostOwner);
  const riderSideField = riderOwner === "A" ? ctx.playerAField : ctx.playerBField;

  /* 1. [무적] */
  if (isAebeolaekingRiderInvulnerable(rider, riderSideField)) {
    return { updatedHost: host, deadRider: null, sharedToRider: 0, blocked: "invuln", absorbedByBarrier: 0 };
  }

  /* 2. 50% 공유 + 방어막 */
  const rawShare = Math.max(1, Math.floor(hostDamageReceived * AEBEOLAEKING_DAMAGE_SHARE_RATIO));
  const afterBangEomak = reduceDamageByRiderSideBangEomak(rider, rawShare, riderSideField);

  /* 3. 보호막 흡수 */
  const { riderAfter, damageAfter, absorbedByBarrier } = absorbRiderBarrier(rider, afterBangEomak);

  /* 4. hp 차감 */
  const newRiderHp = Math.max(0, (riderAfter.currentHp ?? 0) - damageAfter);
  if (newRiderHp <= 0 && damageAfter > 0) {
    return {
      updatedHost: { ...host, parasiteRider: null },
      deadRider: { ...riderAfter, currentHp: 0 },
      sharedToRider: damageAfter,
      blocked: null,
      absorbedByBarrier,
    };
  }
  return {
    updatedHost: { ...host, parasiteRider: { ...riderAfter, currentHp: newRiderHp } },
    deadRider: null,
    sharedToRider: damageAfter,
    blocked: null,
    absorbedByBarrier,
  };
}

/**
 * rider가 직접 피해를 받았을 때, rider에게 피해를 적용 + host에 50% 공유 피해.
 * - rider 사망 시 host에서 분리, deadRider 반환.
 * - host 사망 여부는 호출자가 updatedHost.currentHp ≤ 0인지 확인하여 처리.
 * - hostShareDamage는 host에게 적용된 공유 피해(floor·최소 1).
 * - 보호 무시 — 호환성용.
 */
export function applyAebeolaekingDamageToRiderAndShareToHost(
  host: FieldCard,
  damageToRider: number
): { updatedHost: FieldCard; deadRider: FieldCard | null; hostShareDamage: number } {
  if (damageToRider <= 0) return { updatedHost: host, deadRider: null, hostShareDamage: 0 };
  const riderResult = applyDamageToAebeolaekingRiderInHost(host, damageToRider);
  const share = Math.max(1, Math.floor(damageToRider * AEBEOLAEKING_DAMAGE_SHARE_RATIO));
  const newHostHp = Math.max(0, (riderResult.updatedHost.currentHp ?? 0) - share);
  return {
    updatedHost: { ...riderResult.updatedHost, currentHp: newHostHp },
    deadRider: riderResult.deadRider,
    hostShareDamage: share,
  };
}

/**
 * rider 직접 데미지 + host 공유 — rider 진영(host 반대편) 보호를 통과·차단.
 * 처리 순서 (rider측):
 *  1. rider [무적] → 데미지 0. host에도 공유 0(공유 패시브의 본질이 데미지의 50%이므로 무적이면 0의 50%=0).
 *  2. rider 진영 방어막 → −200(최소 100).
 *  3. rider 보호막 흡수.
 *  4. rider hp 차감.
 *  5. host 공유 = (실제로 rider에게 적용된 데미지) × 50% — host 측 보호는 호출자가 별도 적용.
 * - 반환: 갱신된 host(rider 보호막/hp 반영, host hp는 단순 50% 차감)·deadRider·hostShareDamage.
 */
export function applyAebeolaekingDamageToRiderAndShareToHostWithProtection(
  host: FieldCard,
  damageToRider: number,
  ctx: {
    hostOwner: "A" | "B";
    playerAField: SimulationPlayerField;
    playerBField: SimulationPlayerField;
  }
): {
  updatedHost: FieldCard;
  deadRider: FieldCard | null;
  riderDamageApplied: number;
  hostShareDamage: number;
  blocked: "invuln" | null;
  absorbedByBarrier: number;
} {
  if (damageToRider <= 0) {
    return {
      updatedHost: host,
      deadRider: null,
      riderDamageApplied: 0,
      hostShareDamage: 0,
      blocked: null,
      absorbedByBarrier: 0,
    };
  }
  if (!hasAebeolaekingRider(host)) {
    return {
      updatedHost: host,
      deadRider: null,
      riderDamageApplied: 0,
      hostShareDamage: 0,
      blocked: null,
      absorbedByBarrier: 0,
    };
  }
  const rider = host.parasiteRider!;
  const riderOwner = getAebeolaekingRiderOwnerFromHostOwner(ctx.hostOwner);
  const riderSideField = riderOwner === "A" ? ctx.playerAField : ctx.playerBField;

  if (isAebeolaekingRiderInvulnerable(rider, riderSideField)) {
    return {
      updatedHost: host,
      deadRider: null,
      riderDamageApplied: 0,
      hostShareDamage: 0,
      blocked: "invuln",
      absorbedByBarrier: 0,
    };
  }

  const afterBangEomak = reduceDamageByRiderSideBangEomak(rider, damageToRider, riderSideField);
  const { riderAfter, damageAfter, absorbedByBarrier } = absorbRiderBarrier(rider, afterBangEomak);

  const newRiderHp = Math.max(0, (riderAfter.currentHp ?? 0) - damageAfter);
  const share = damageAfter > 0 ? Math.max(1, Math.floor(damageAfter * AEBEOLAEKING_DAMAGE_SHARE_RATIO)) : 0;
  const newHostHp = Math.max(0, (host.currentHp ?? 0) - share);

  if (newRiderHp <= 0 && damageAfter > 0) {
    return {
      updatedHost: { ...host, parasiteRider: null, currentHp: newHostHp },
      deadRider: { ...riderAfter, currentHp: 0 },
      riderDamageApplied: damageAfter,
      hostShareDamage: share,
      blocked: null,
      absorbedByBarrier,
    };
  }
  return {
    updatedHost: {
      ...host,
      parasiteRider: { ...riderAfter, currentHp: newRiderHp },
      currentHp: newHostHp,
    },
    deadRider: null,
    riderDamageApplied: damageAfter,
    hostShareDamage: share,
    blocked: null,
    absorbedByBarrier,
  };
}
