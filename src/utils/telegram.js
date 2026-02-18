const BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;

export const sendTelegramMessage = async (chatId, text) => {
    if (!chatId) {
        console.error('Telegram: No Chat ID provided.');
        return false;
    }

    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown'
            })
        });

        const data = await response.json();
        if (!data.ok) {
            console.error('Telegram Error:', data.description);
            return false;
        }
        return true;
    } catch (error) {
        console.error('Telegram Network Error:', error);
        return false;
    }
};

export const getTelegramUpdates = async () => {
    try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`;
        const response = await fetch(url);
        const data = await response.json();

        if (data.ok && data.result.length > 0) {
            // Return the most recent chat ID that isn't a group (if possible) or just the last one
            const updates = data.result;
            const lastMessage = updates[updates.length - 1].message;
            if (lastMessage && lastMessage.chat) {
                return {
                    chatId: lastMessage.chat.id,
                    username: lastMessage.chat.username,
                    firstName: lastMessage.chat.first_name
                };
            }
        }
        return null;
    } catch (error) {
        console.error('Error fetching Telegram updates:', error);
        return null;
    }
};
