"""基础对话模式 - 知识库问答（核心）"""


class BaseChatMode:
    """所有对话模式的基类"""

    name = "chat"
    description = "基础知识库问答"

    async def process(self, question: str, context: dict) -> dict:
        raise NotImplementedError
