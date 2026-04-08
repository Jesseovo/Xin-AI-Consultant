export interface TutorBotSummary {
  id: string;
  name: string;
  description: string;
  subject_tags: string[];
  teacher_name: string;
  usage_count: number;
}

export interface ChatSessionSummary {
  id: string;
  title: string;
  bot_name: string;
  last_message_at: string;
  message_count: number;
}
