# backend/app/services/ai_service.py
import os
import google.generativeai as genai
# 导入 generation_types 以便进行类型检查
from google.generativeai.types import HarmCategory, HarmBlockThreshold, generation_types
from google.api_core import exceptions as google_exceptions
import logging
from app.constants.ai_constants import (
  TRAVEL_ADVICE_SYSTEM_INSTRUCTION,
  AI_MODEL_FALLBACK_LIST,
  DIARY_GENERATION_SYSTEM_INSTRUCTION,
  MOOD_ANALYSIS_SYSTEM_INSTRUCTION
)
import json
import re
from datetime import datetime
from app.config import settings
from typing import Callable, Any

logger = logging.getLogger(__name__)

# 仅在本地开发时使用代理
if settings.ENVIRONMENT == "development":
  os.environ["http_proxy"] = "http://127.0.0.1:7890"
  pass

# 配置 API Key
GOOGLE_API_KEY = settings.GOOGLE_API_KEY
if not GOOGLE_API_KEY:
  logger.warning("未检测到 GOOGLE_API_KEY")
else:
  genai.configure(api_key=GOOGLE_API_KEY)

# [最佳实践] 将安全配置定义为常量，方便复用和统一管理
DEFAULT_SAFETY_SETTINGS = {
  HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
}

# [核心修复点1] 为需要 JSON 输出的任务定义一个专门的生成配置
# - temperature=0.2: 降低随机性，让模型输出更稳定、可预测，非常适合生成 JSON。
# - response_mime_type="application/json": 强制模型直接输出 JSON 格式，避免生成 markdown 包裹或其他无关文本。
#   这是 Gemini 的一个强大功能，可以极大提升结构化数据输出的可靠性。
JSON_GENERATION_CONFIG = genai.types.GenerationConfig(
  temperature=0.2,
  response_mime_type="application/json",
)


async def _execute_genai_request_with_fallback(
    generation_func: Callable,
    system_instruction: str = None
) -> Any:
  """
  执行 GenAI 请求，并在遇到配额错误时自动降级到下一个可用模型。

  Args:
      generation_func: 一个接受 model_name 作为参数并返回 GenAI 响应的 lambda 函数。
      system_instruction: 用于初始化模型的系统指令。

  Returns:
      成功时的 GenAI 响应对象。

  Raises:
      Exception: 如果所有模型都尝试失败，则抛出最后一个遇到的异常。
  """
  if not GOOGLE_API_KEY:
    logger.error("API Key missing, cannot execute GenAI request.")
    raise ValueError("Server is not configured with an AI API Key.")

  last_exception = None
  for model_name in AI_MODEL_FALLBACK_LIST:
    try:
      logger.info(f"Attempting to use model: {model_name}")
      model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=system_instruction
      )
      response = await generation_func(model)
      logger.info(f"Successfully received response from model: {model_name}")
      return response

    except google_exceptions.ResourceExhausted as e:
      logger.warning(f"Quota exceeded for model {model_name}. Details: {str(e)[:150]}...")
      logger.warning(f"Falling back to the next available model...")
      last_exception = e
      continue

    except Exception as e:
      logger.error(f"An unexpected error occurred with model {model_name}: {e}", exc_info=True)
      if "403" in str(e) or "User location is not supported" in str(e):
        raise RuntimeError("AI service is not available in the current region (Region Error).")
      if "504" in str(e) or "timeout" in str(e).lower():
        raise RuntimeError("Connection to AI server timed out, please check network settings.")
      raise e

  logger.error("All AI models in the fallback list have failed.")
  if last_exception:
    raise last_exception
  else:
    raise RuntimeError("AI service is currently unavailable after trying all models.")


async def get_travel_advice(frontend_messages: list):
  """
  调用 Gemini 模型获取旅行建议，并支持自动降级。
  """
  try:
    logger.info("Preparing to call Gemini API for travel advice...")

    gemini_history = []
    history_messages = frontend_messages[:-1]
    last_message = frontend_messages[-1]['content']

    for msg in history_messages:
      role = "user" if msg['role'] == "user" else "model"
      gemini_history.append({"role": role, "parts": [msg['content']]})

    async def generation_logic(model: genai.GenerativeModel):
      chat = model.start_chat(history=gemini_history)
      logger.info(f"Sending message to Gemini ({model.model_name}): {last_message[:30]}...")
      return await chat.send_message_async(
        last_message,
        safety_settings=DEFAULT_SAFETY_SETTINGS
      )

    response = await _execute_genai_request_with_fallback(
      generation_func=generation_logic,
      system_instruction=TRAVEL_ADVICE_SYSTEM_INSTRUCTION
    )

    try:
      text = response.text
      logger.info("Gemini API call successful.")
      return text
    except (ValueError, IndexError):
      logger.error(f"AI response was empty or blocked. Response object: {response}", exc_info=False)
      if response.prompt_feedback:
        logger.error(f"Prompt Feedback: {response.prompt_feedback}")
      if response.candidates and response.candidates[0].finish_reason.name == "SAFETY":
        logger.error(f"Candidate Finish Reason: SAFETY")
        logger.error(f"Candidate Safety Ratings: {response.candidates[0].safety_ratings}")
        return "抱歉，AI 的回答被安全系统拦截了，请尝试换一种问法。"
      return "抱歉，AI 暂时无法回答，请稍后再试。"


  except Exception as e:
    logger.error(f"Failed to get travel advice: {e}", exc_info=True)
    return f"抱歉，AI 暂时有点累，请稍后再试。(Error: {e})"


async def generate_diary_draft(user_prompt: str):
  """
  根据用户描述生成日记草稿 JSON，并支持自动降级。
  """
  try:
    today_str = datetime.now().strftime("%Y-%m-%d")
    full_prompt = (
      f"Reference Date (Today's Date): {today_str}.\n"
      f"Please generate a travel diary JSON based on the following description:\n{user_prompt}"
    )
    async def generation_logic(model: genai.GenerativeModel):
      logger.info(f"Generating diary draft with model {model.model_name}...")
      logger.debug(f"Full prompt for diary generation:\n---\n{full_prompt}\n---")
      return await model.generate_content_async(
        full_prompt,
        safety_settings=DEFAULT_SAFETY_SETTINGS,
        generation_config=JSON_GENERATION_CONFIG
      )
    response = await _execute_genai_request_with_fallback(
      generation_func=generation_logic,
      system_instruction=DIARY_GENERATION_SYSTEM_INSTRUCTION
    )
    text = ""
    try:
      text = response.text
    except (ValueError, IndexError):
      logger.error(f"AI response was empty or blocked. Analyzing response details...")
      if response.candidates:
        candidate = response.candidates[0]
        finish_reason_name = candidate.finish_reason.name
        logger.error(f"Candidate Finish Reason: {finish_reason_name} ({candidate.finish_reason.value})")

        if finish_reason_name == "SAFETY":
          logger.error(f"Candidate Safety Ratings: {candidate.safety_ratings}")
          raise ValueError("AI response was blocked due to safety settings.")
        else:
          raise ValueError(f"AI failed to generate content. Finish reason: {finish_reason_name}")
      else:
        if response.prompt_feedback:
          logger.error(f"Prompt Feedback: {response.prompt_feedback}")
        raise ValueError("AI response is empty and contains no candidates.")
    # [核心修复] 检查 AI 是否返回了我们定义的结构化错误
    try:
      data = json.loads(text)
    except json.JSONDecodeError as e:
      logger.error(f"Failed to decode JSON from AI response. String was: '{text}'. Error: {e}")
      raise ValueError("AI returned an invalid or incomplete JSON.")
    # 检查返回的 JSON 是否是我们的 fallback 错误格式
    if isinstance(data, dict) and data.get("status") == "error":
      error_message = data.get("message", "AI indicated the prompt was too vague.")
      logger.warning(f"AI returned a structured error: {error_message}")
      # 抛出这个具体的、可被前端利用的错误信息
      raise ValueError(error_message)
    return data
  except Exception as e:
    # 重新组织一下日志，避免重复记录堆栈信息
    # 如果异常是 ValueError，它可能是我们自己抛出的，信息已经很明确了
    if isinstance(e, ValueError):
      logger.error(f"Failed to generate diary draft: {e}")
    else:
      logger.error(f"Failed to generate diary draft: {e}", exc_info=True)
    raise e


async def analyze_mood_text(text: str):
  """
  分析心情文本，返回情感向量，并支持自动降级。
  """
  try:
    async def generation_logic(model: genai.GenerativeModel):
      logger.info(f"Analyzing mood with model {model.model_name}...")
      # [改进] 同样为情感分析添加 JSON 配置
      return await model.generate_content_async(
        text,
        safety_settings=DEFAULT_SAFETY_SETTINGS,
        generation_config=JSON_GENERATION_CONFIG
      )

    response = await _execute_genai_request_with_fallback(
      generation_func=generation_logic,
      system_instruction=MOOD_ANALYSIS_SYSTEM_INSTRUCTION
    )

    result_text = ""
    try:
      result_text = response.text
    except (ValueError, IndexError):
      logger.error(f"Mood analysis response was empty or blocked. Response: {response}")
      # 同样可以加入更详细的诊断
      if response.candidates and response.candidates[0].finish_reason.name == "SAFETY":
        return {"mood_vector": 0.5, "mood_reason": "分析失败(内容被拦截)"}
      return {"mood_vector": 0.5, "mood_reason": "分析失败(AI未生成内容)"}

    # [代码简化] 直接解析 result_text
    data = json.loads(result_text)
    return data
  except Exception as e:
    logger.error(f"Mood Analysis Failed: {e}", exc_info=True)
    return {"mood_vector": 0.5, "mood_reason": "分析失败"}
