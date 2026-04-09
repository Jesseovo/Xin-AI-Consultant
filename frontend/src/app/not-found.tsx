import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[--bg-primary] text-[--text-primary]">
      <img
        src="/images/platform/404.png"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        aria-hidden
      />

      {/* Top: subtle vignette for depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgba(20,20,19,0.35)] via-transparent to-transparent"
        aria-hidden
      />

      {/* Bottom: readable overlay + content in lower third */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[rgba(20,20,19,0.72)] via-[rgba(20,20,19,0.35)] to-transparent sm:via-[rgba(20,20,19,0.2)]" />

      <div className="relative z-10 min-h-screen flex flex-col">
        <div className="flex-1 min-h-[45vh]" />

        <div className="flex flex-col items-center justify-end px-6 pb-14 sm:pb-20 pt-8 text-center max-w-lg mx-auto w-full">
          <div className="sf-glow rounded-2xl px-6 py-5 sm:px-8 sm:py-6 bg-[--bg-elevated]/55 backdrop-blur-md backdrop-saturate-150 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)]">
            <h1 className="text-[28px] sm:text-[32px] font-semibold tracking-tight text-[#faf9f5] drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
              页面不存在
            </h1>
            <p className="mt-3 text-[14px] sm:text-[15px] text-[#e8e6dc] leading-relaxed max-w-sm mx-auto drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
              你访问的页面可能已移除或地址有误
            </p>
            <Link
              href="/"
              className="sf-btn-primary inline-flex items-center justify-center mt-8 px-10 py-3.5 text-[15px] rounded-full no-underline"
            >
              返回首页
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
