"use client";

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  teacherContact?: {
    name: string;
    contact: string;
    type: string;
  };
  streaming?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

interface ChatState {
  conversations: Conversation[];
  activeId: string | null;
}

type ChatAction =
  | { type: "LOAD"; state: ChatState }
  | { type: "NEW_CONVERSATION"; id: string }
  | { type: "SWITCH_CONVERSATION"; id: string }
  | { type: "DELETE_CONVERSATION"; id: string }
  | { type: "GO_HOME" }
  | { type: "ADD_MESSAGE"; convId: string; message: Message }
  | { type: "UPDATE_MESSAGE"; convId: string; messageId: string; content: string; streaming?: boolean }
  | { type: "SET_TITLE"; convId: string; title: string };

const STORAGE_KEY = "qa-conversations";

function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function reducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "LOAD":
      return action.state;

    case "NEW_CONVERSATION": {
      const conv: Conversation = {
        id: action.id,
        title: "新对话",
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      return {
        conversations: [conv, ...state.conversations],
        activeId: conv.id,
      };
    }

    case "SWITCH_CONVERSATION":
      return { ...state, activeId: action.id };

    case "GO_HOME":
      return { ...state, activeId: null };

    case "DELETE_CONVERSATION": {
      const filtered = state.conversations.filter((c) => c.id !== action.id);
      return {
        conversations: filtered,
        activeId: state.activeId === action.id ? null : state.activeId,
      };
    }

    case "ADD_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.convId
            ? { ...c, messages: [...c.messages, action.message], updatedAt: Date.now() }
            : c
        ),
      };
    }

    case "UPDATE_MESSAGE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.convId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === action.messageId
                    ? { ...m, content: action.content, streaming: action.streaming ?? m.streaming }
                    : m
                ),
                updatedAt: Date.now(),
              }
            : c
        ),
      };
    }

    case "SET_TITLE": {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.convId ? { ...c, title: action.title } : c
        ),
      };
    }

    default:
      return state;
  }
}

const initialState: ChatState = { conversations: [], activeId: null };

interface ChatContextValue {
  state: ChatState;
  dispatch: Dispatch<ChatAction>;
  activeConversation: Conversation | null;
  createConversation: () => string;
  switchConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  goHome: () => void;
  addMessage: (convId: string, message: Message) => void;
  updateMessage: (convId: string, messageId: string, content: string, streaming?: boolean) => void;
  genId: () => string;
}

const ChatContext = createContext<ChatContextValue | null>(null);

function loadState(): ChatState {
  if (typeof window === "undefined") return initialState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.conversations) return parsed;
    }
  } catch { /* ignore corrupt data */ }
  return initialState;
}

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    const loaded = loadState();
    if (loaded.conversations.length > 0) {
      dispatch({ type: "LOAD", state: { ...loaded, activeId: null } });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch { /* storage full */ }
  }, [state]);

  const activeConversation =
    state.conversations.find((c) => c.id === state.activeId) ?? null;

  const createConversation = useCallback(() => {
    const id = genId();
    dispatch({ type: "NEW_CONVERSATION", id });
    return id;
  }, []);

  const switchConversation = useCallback((id: string) => {
    dispatch({ type: "SWITCH_CONVERSATION", id });
  }, []);

  const deleteConversation = useCallback((id: string) => {
    dispatch({ type: "DELETE_CONVERSATION", id });
  }, []);

  const goHome = useCallback(() => {
    dispatch({ type: "GO_HOME" });
  }, []);

  const addMessage = useCallback((convId: string, message: Message) => {
    dispatch({ type: "ADD_MESSAGE", convId, message });
  }, []);

  const updateMessage = useCallback(
    (convId: string, messageId: string, content: string, streaming?: boolean) => {
      dispatch({ type: "UPDATE_MESSAGE", convId, messageId, content, streaming });
    },
    []
  );

  return (
    <ChatContext.Provider
      value={{
        state,
        dispatch,
        activeConversation,
        createConversation,
        switchConversation,
        deleteConversation,
        goHome,
        addMessage,
        updateMessage,
        genId,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChatStore(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatStore must be used within ChatProvider");
  return ctx;
}
