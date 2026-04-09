import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[--bg-primary] text-[--text-primary] px-4">
      <img src="/images/platform/404.png" alt="页面不存在" className="w-48 h-48 object-contain mb-6" />
      <h1 className="text-[24px] font-semibold mb-2">页面不存在</h1>
      <p className="text-[14px] text-[--text-secondary] mb-6">你访问的页面可能已移除或地址有误</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-xl bg-[--accent] text-[--accent-text] text-[14px] font-medium no-underline"
      >
        返回首页
      </Link>
    </div>
  );
}
