# backend/app/services/ai_service.py
import os
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import logging
from app.constants.ai_constants import SYSTEM_INSTRUCTION, DEFAULT_MODEL_NAME

logger = logging.getLogger(__name__)

# ==================== 代理配置 (关键) ====================
os.environ["http_proxy"] = "http://127.0.0.1:7890"
os.environ["https_proxy"] = "http://127.0.0.1:7890"

# 配置 API Key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if GOOGLE_API_KEY:
  genai.configure(api_key=GOOGLE_API_KEY)
else:
  logger.warning("未检测到 GOOGLE_API_KEY，AI 功能将不可用")

async def get_travel_advice(frontend_messages: list):
  """
  调用 gemini-2.5-flash 模型 (异步版本)
  """
  if not GOOGLE_API_KEY:
    logger.error("API Key missing")
    return "抱歉，服务器未配置 AI 密钥。"

  logger.info("正在准备调用 Gemini API...") # 添加日志

  try:
    # 1. 初始化模型
    model = genai.GenerativeModel(
      model_name=DEFAULT_MODEL_NAME,
      system_instruction=SYSTEM_INSTRUCTION
    )

    # 2. 转换历史消息格式
    gemini_history = []
    history_messages = frontend_messages[:-1]
    last_message = frontend_messages[-1]['content']

    for msg in history_messages:
      role = "user" if msg['role'] == "user" else "model"
      gemini_history.append({
        "role": role,
        "parts": [msg['content']]
      })

    # 3. 开启对话会话
    chat = model.start_chat(history=gemini_history)

    logger.info(f"发送消息给 Gemini: {last_message[:20]}...")

    # 4. 发送消息 - 【关键修改】使用异步方法并 await
    # 注意：google-generativeai 库提供了 send_message_async 方法
    response = await chat.send_message_async(
      last_message,
      safety_settings={
        HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
      }
    )

    logger.info("Gemini API 调用成功")
    return response.text

  except Exception as e:
    logger.error(f"Gemini AI Error: {str(e)}", exc_info=True)
    # 区分一下是网络错误还是其他错误
    if "403" in str(e) or "User location is not supported" in str(e):
      return "抱歉，AI 服务在当前地区不可用 (Region Error)。"
    if "504" in str(e) or "timeout" in str(e).lower():
      return "抱歉，连接 AI 服务器超时，请检查网络设置。"

    return f"抱歉，AI 暂时有点累，请稍后再试。(Error: {str(e)[:50]}...)"
