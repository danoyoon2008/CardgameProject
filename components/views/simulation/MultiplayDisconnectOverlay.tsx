"use client";

function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 20h.01" />
      <path d="M8.5 16.429a5 5 0 0 1 7 0" />
      <path d="M5 12.859a10 10 0 0 1 5.17-2.69" />
      <path d="M19 12.859a10 10 0 0 0-2.007-1.523" />
      <path d="M2 8.82a15 15 0 0 1 4.177-2.643" />
      <path d="M22 8.82a15 15 0 0 0-11.288-3.764" />
      <path d="m2 2 20 20" />
    </svg>
  );
}

type MultiplayDisconnectOverlayProps = {
  secondsLeft: number | null;
};

export default function MultiplayDisconnectOverlay({ secondsLeft }: MultiplayDisconnectOverlayProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[40] flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px]"
      role="status"
      aria-live="polite"
    >
      <WifiOffIcon className="mb-3 h-12 w-12 text-red-500" />
      <p className="text-center text-sm font-bold text-white sm:text-base">상대방 연결이 끊겼습니다</p>
      {secondsLeft !== null ? (
        <p className="mt-2 text-center text-xs font-semibold tabular-nums text-red-300 sm:text-sm">
          {secondsLeft}초 후 승리 처리
        </p>
      ) : null}
    </div>
  );
}
