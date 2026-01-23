# backend/app/services/ai_service.py
import os
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
import logging
from app.constants.ai_constants import SYSTEM_INSTRUCTION, DEFAULT_MODEL_NAME, DIARY_GENERATION_SYSTEM_INSTRUCTION, MOOD_ANALYSIS_SYSTEM_INSTRUCTION
import json
import re
from datetime import datetime
from app.config import settings

logger = logging.getLogger(__name__)

# 仅在本地开发时使用代理
if settings.ENVIRONMENT == "development":
  # 只有本地需要代理时才开启，或者直接在本地 .env 里设环境变量
  os.environ["http_proxy"] = "http://127.0.0.1:7890"
  pass

# 配置 API Key
GOOGLE_API_KEY = settings.GOOGLE_API_KEY
if not GOOGLE_API_KEY:
  logger.warning("未检测到 GOOGLE_API_KEY")
else:
  genai.configure(api_key=GOOGLE_API_KEY)


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


async def generate_diary_draft(user_prompt: str):
  """
  根据用户描述生成日记草稿 JSON
  """
  if not GOOGLE_API_KEY:
    return None
  try:
    # 使用专门的 System Instruction 初始化模型
    model = genai.GenerativeModel(
      model_name=DEFAULT_MODEL_NAME,
      system_instruction=DIARY_GENERATION_SYSTEM_INSTRUCTION
    )
    # [新增] 获取当前日期
    today_str = datetime.now().strftime("%Y-%m-%d")
    # [修改] 提示词增强，将当前日期注入到 Prompt 中
    # 告诉 AI："今天是 {today_str}，如果用户没说日期，就用这个。"
    full_prompt = (
      f"参考日期(Today's Date): {today_str}。\n"
      f"请根据以下描述生成旅行日记 JSON：\n{user_prompt}"
    )

    logger.info(f"发送给AI的Prompt包含日期: {today_str}") # [建议] 添加日志方便调试
    response = await model.generate_content_async(full_prompt)
    text = response.text

    # ... (后面的清理和解析代码保持不变) ...
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'\s*```$', '', text, flags=re.MULTILINE)
    try:
      data = json.loads(text)
      return data
    except json.JSONDecodeError:
      logger.error(f"AI 返回了非法的 JSON: {text}")
      return None
  except Exception as e:
    logger.error(f"生成日记失败: {str(e)}", exc_info=True)
    raise e

async def analyze_mood_text(text: str):
  """
  分析心情文本，返回情感向量
  """
  if not GOOGLE_API_KEY:
    # 默认中性
    return {"mood_vector": 0.5, "mood_reason": "AI服务未配置"}

  try:
    model = genai.GenerativeModel(
      model_name=DEFAULT_MODEL_NAME,
      system_instruction=MOOD_ANALYSIS_SYSTEM_INSTRUCTION
    )

    response = await model.generate_content_async(text)
    result_text = response.text

    # 清理 JSON
    result_text = re.sub(r'^```json\s*', '', result_text, flags=re.MULTILINE)
    result_text = re.sub(r'^```\s*', '', result_text, flags=re.MULTILINE)
    result_text = re.sub(r'\s*```$', '', result_text, flags=re.MULTILINE)

    data = json.loads(result_text)
    return data
  except Exception as e:
    logger.error(f"Mood Analysis Failed: {e}")
    # 降级处理
    return {"mood_vector": 0.5, "mood_reason": "分析失败"}