import type { CSSProperties, ImgHTMLAttributes, MouseEvent } from "react";

export const MOBILE_CARD_TOUCH_BLOCK_STYLE: CSSProperties = {
  WebkitTouchCallout: "none",
  WebkitUserSelect: "none",
  userSelect: "none",
};

export function preventImageContextMenu(e: MouseEvent) {
  e.preventDefault();
}

/** 카드 이미지: 길게 누름 저장 메뉴·드래그 방지 */
export function GuardedImg({ onContextMenu, draggable, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  return (
    <img
      {...props}
      draggable={draggable ?? false}
      onContextMenu={e => {
        onContextMenu?.(e);
        e.preventDefault();
      }}
    />
  );
}
