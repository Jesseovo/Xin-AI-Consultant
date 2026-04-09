"use client";

export default function TeacherStudentsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary] tracking-tight">学生数据</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-6">学习行为与互动统计（对接后端后展示图表）</p>
      <div className="sf-card rounded-[20px] p-8 sm:p-10 text-center">
        <div className="rounded-[20px] overflow-hidden sf-glow mb-6">
          <img
            src="/images/student/progress-header.png"
            alt="数据看板"
            className="w-full max-w-lg h-48 mx-auto object-contain bg-[--bg-card]/40"
          />
        </div>
        <p className="text-[15px] font-medium text-[--text-primary] tracking-tight">数据看板开发中</p>
        <p className="text-[13px] text-[--text-muted] mt-2 max-w-sm mx-auto leading-relaxed">
          学生进度与互动图表即将上线，敬请期待。
        </p>
      </div>
    </div>
  );
}
