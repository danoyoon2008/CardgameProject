/**
 * [기절] 중앙 연출 — 바깥에서 안으로 말려 들어가는 단일 나선 (viewBox 0 0 100 100).
 * 로그 나선 r = r0 * exp(k * θ), θ 증가에 따라 반지름 감소(안으로 수렴).
 * 생성 후 바운딩을 정사각형으로 맞춰 스케일·중앙 정렬 → 회전 시 원형에 가깝게 보이도록 비율만 조정.
 */
const CX = 50;
const CY = 50;
const R0 = 41;
const R1 = 4.2;
const TURNS = 2.45;
const STEPS = 64;
/** viewBox 가장자리 여백 (균일) */
const VIEW_MARGIN = 8;
/** path stroke가 viewBox 밖으로 삐져 나가지 않도록 bbox 확장(유저 단위, 대략 stroke 폭의 절반) */
const STROKE_BBOX_PAD = 2.4;

function buildStunSpiralPathD(): string {
  const thetaMax = TURNS * 2 * Math.PI;
  const k = Math.log(R1 / R0) / thetaMax;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= STEPS; i++) {
    const t = i / STEPS;
    const theta = t * thetaMax;
    const r = R0 * Math.exp(k * theta);
    pts.push({
      x: CX + r * Math.cos(theta),
      y: CY + r * Math.sin(theta),
    });
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  minX -= STROKE_BBOX_PAD;
  minY -= STROKE_BBOX_PAD;
  maxX += STROKE_BBOX_PAD;
  maxY += STROKE_BBOX_PAD;

  const w = maxX - minX;
  const h = maxY - minY;
  const size = Math.max(w, h);
  const boxCx = (minX + maxX) / 2;
  const boxCy = (minY + maxY) / 2;
  const usable = 100 - 2 * VIEW_MARGIN;
  const scale = usable / size;

  const parts: string[] = [];
  for (let i = 0; i < pts.length; i++) {
    const x = (pts[i].x - boxCx) * scale + 50;
    const y = (pts[i].y - boxCy) * scale + 50;
    parts.push(i === 0 ? `M ${x.toFixed(3)} ${y.toFixed(3)}` : `L ${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return parts.join(" ");
}

export const STUN_SPIRAL_PATH_D = buildStunSpiralPathD();
