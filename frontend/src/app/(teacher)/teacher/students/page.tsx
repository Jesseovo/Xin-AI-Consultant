"use client";

export default function TeacherStudentsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-[22px] font-semibold text-[--text-primary]">学生数据</h1>
      <p className="text-[13px] text-[--text-secondary] mt-0.5 mb-6">学习行为与互动统计（对接后端后展示图表）</p>
      <div className="sf-card rounded-2xl p-8 text-center">
        <img src="/images/student/progress-header.png" alt="数据看板" className="w-full max-w-md h-48 mx-auto rounded-xl object-contain mb-4" />
        <p className="text-[14px] text-[--text-secondary]">数据看板开发中</p>
      </div>
    </div>
  );
}
