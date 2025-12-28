function isValidMessage(m) {
  return (
    m &&
    typeof m === "object" &&
    (m.role === "system" || m.role === "user" || m.role === "assistant") &&
    typeof m.content === "string"
  );
}

function detectUserLanguage(messages) {
  const lastUser = [...messages].reverse().find((m) => m.role === "user" && typeof m.content === "string");
  const text = lastUser?.content || "";
  return /[\u4e00-\u9fff]/.test(text) ? "zh" : "en";
}

function baseSystemPrompt(language) {
  if (language === "zh") {
    return [
      "你是 China Medical Tour 的智能客服（Smart CS）。",
      "你只能提供信息与流程建议，不构成医疗诊断或治疗建议；请咨询专业医生与官方机构。",
      "你必须礼貌、简洁、可执行（给出下一步操作）。",
      "回答语言必须跟随用户输入语言。",
      "你可以回答范围：签证流程、体检/医疗套餐介绍、预约流程、医院资质与位置、费用与行程安排等。",
      "签证限制：不提供邀请信或签证代办，仅提供政策/流程信息，签证需通过官方渠道申请。",
      "不要将邀请信列为签证材料或暗示我们可以获取邀请信。",
      "禁止：提供医疗诊断、处方、具体治疗建议；编造官方信息或资质。",
    ].join("\n");
  }

  return [
    "You are Smart CS for China Medical Tour.",
    "Disclaimer: I provide information and process guidance only, not medical diagnosis or treatment advice.",
    "Be polite, concise, and actionable (give next steps).",
    "Reply in the user's language.",
    "You can cover visa process, packages, booking flow, hospital credentials, pricing, and itinerary logistics.",
    "Visa restrictions: Do not claim we provide invitation letters or handle visa applications; users must apply via official channels.",
    "Do not list invitation letters as required documents or suggest we can obtain them.",
    "Lead intake: If the user explores services, ask one short multiple-choice question at the end to gather purpose, city, stay duration, budget range (optional), language, contact (email/WhatsApp), and feedback. Ask one at a time.",
    "Scheduling: Do not confirm bookings or say a consultation is scheduled. You can say we can help arrange after details are collected.",
    "Emoji: Greeting must include 1-2 emojis. Only add emojis in the greeting line or in gentle closing lines (thanks, encouragement, reassurance). If there is no closing, do not add extra emojis.",
    "Do not provide diagnosis, prescriptions, or treatment recommendations; do not fabricate official details.",
  ].join("\n");
}

const DEFAULT_MAX_CHARS = 6000;
const CONTEXT_BUFFER_CHARS = 512;

function totalChars(messages) {
  return messages.reduce((sum, m) => sum + (m?.content?.length || 0), 0);
}

function getMaxChars(messages) {
  const system = messages.find((m) => m.role === "system");
  const systemLen = system?.content?.length || 0;
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const lastUserLen = lastUser?.content?.length || 0;
  return Math.max(DEFAULT_MAX_CHARS, systemLen + lastUserLen + CONTEXT_BUFFER_CHARS);
}

function truncateToMaxChars(messages, maxChars) {
  let current = messages.slice();
  while (totalChars(current) > maxChars) {
    const systemIndex = current.findIndex((m) => m.role === "system");
    const start = systemIndex === -1 ? 0 : systemIndex + 1;
    let removed = false;
    for (let i = start; i < current.length - 1; i++) {
      if (current[i].role === "user" && current[i + 1].role === "assistant") {
        current.splice(i, 2);
        removed = true;
        break;
      }
    }
    if (!removed) {
      if (start < current.length) current.splice(start, 1);
      else break;
    }
  }
  return current;
}

export function normalizeAndTruncateMessages(rawMessages, { requestId }) {
  const filtered = rawMessages.filter(isValidMessage);
  
  // Check if there is at least one system message
  const hasSystem = filtered.some(m => m.role === "system");
  
  let merged = filtered;

  if (!hasSystem) {
    // Fallback to a base prompt if none provided
    const language = detectUserLanguage(filtered);
    merged = [{ role: "system", content: baseSystemPrompt(language) }, ...filtered];
  }

  const maxChars = getMaxChars(merged);
  if (totalChars(merged) <= maxChars) return merged;
  return truncateToMaxChars(merged, maxChars);
}
