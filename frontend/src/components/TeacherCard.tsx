"use client";

interface TeacherCardProps {
  name: string;
  contact: string;
  contactType: string;
}

export default function TeacherCard({ name, contact, contactType }: TeacherCardProps) {
  return (
    <div className="ml-[42px] sm:ml-[42px] sf-card p-4 my-2 max-w-[70%] animate-fade border-[#ff9f0a]/20 bg-[#ff9f0a]/[0.06]">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-[#ff9f0a]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <span className="text-[13px] font-semibold text-[#ff9f0a]">联系老师获取帮助</span>
      </div>
      <div className="text-[13px] text-[--text-secondary] space-y-0.5">
        <p><span className="text-[--text-primary] font-medium">老师：</span>{name}</p>
        <p><span className="text-[--text-primary] font-medium">{contactType}：</span>{contact}</p>
      </div>
    </div>
  );
}
