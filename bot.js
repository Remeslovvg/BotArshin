const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = '7857168232:AAGN6xd72s5p05jMJ3tk3blKJH2LxKWrvng';

const bot = new TelegramBot(token, { polling: true });

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, `👋 Привет, ${msg.from.first_name}!
Я помогу проверить статус средства измерений через ФГИС Аршин.

Введите номер свидетельства о поверке в формате:
*16078-13* или другой номер поверки.`, { parse_mode: 'Markdown' });
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text?.trim();

  if (!text || text.startsWith('/')) return;

  await bot.sendMessage(chatId, '🔍 Ищу информацию, пожалуйста, подождите...');

  try {
    const response = await axios.get('https://fgis.gost.ru/fundmetrology/eapi/vri', {
      params: {
        search: text,
        rows: 1,
        start: 0
      }
    });

    console.log('Ответ API:', JSON.stringify(response.data, null, 2));

    const docs = response.data.result.items;

    if (!Array.isArray(docs) || docs.length === 0) {
      await bot.sendMessage(chatId, '❌ Средство измерений не найдено. Проверьте правильность номера поверки.');
      return;
    }

    const doc = docs[0];

    const name = doc.mit_notation || 'Не указано';
    const serial = doc.mi_number || 'Не указано';
    const vriNumber = doc.mit_number || 'Не указано';
    const verificationDate = doc.verification_date || 'Не указано';
    const validDate = doc.valid_date || 'Не указано';
    const organization = doc.org_title || 'Не указано';
    const status = doc.applicability ? '✅ Действительно' : '❌ Недействительно';

    const message = `
${status} *Средство измерений найдено!*

📄 *Наименование:* ${name}
🏷 *Заводской номер:* ${serial}
📑 *Номер свидетельства:* ${vriNumber}

📅 *Дата поверки:* ${verificationDate}
⏳ *Действительно до:* ${validDate}

📍 *Организация поверки:* ${organization}

💡 *Статус:* ${status === '✅ Действительно' ? 'Действительно' : 'Недействительно'}
    `;

    await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });

  } catch (error) {
    console.error('Ошибка запроса:', error);
    await bot.sendMessage(chatId, '⚠️ Произошла ошибка при запросе к Аршину. Возможно, сервис недоступен или введён неправильный номер.');
  }
});
