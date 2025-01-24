import asyncio
import os
import time
from telegram import Bot
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
TELEGRAM_TOKEN = os.getenv("TELEGRAM_TOKEN")
CHAT_ID = os.getenv("CHAT_ID")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

bot = Bot(token=TELEGRAM_TOKEN)

last_sent_time = 0
message_interval = 5

async def send_start_message():
    """Отправить сообщение при запуске бота"""
    await bot.send_message(chat_id=CHAT_ID, text="Бот запущен")

async def send_shutdown_message():
    """Отправить сообщение при отключении бота"""
    await bot.send_message(chat_id=CHAT_ID, text="Бот отключен пользователем")

async def check_and_send():
    global last_sent_time

    while True:
        current_time = time.time()

        if current_time - last_sent_time >= message_interval:
            response = supabase.table("mein-kun").select("title, description, price, url, city, image, sended_to_telegram").eq("sended_to_telegram", False).execute()

            print(f'Response: {response}')

            for record in response.data:
                title = record['title']
                description = record['description']
                price = record['price']
                url = record['url']
                city = record['city']
                image = record['image']

                message = f"""
                <b>{title}</b>

                
Описание: {description}


Город: <b>{city}</b>

Цена: <b><u>{price}</u></b>
<a href="https://www.avito.ru{url}">Перейти на Avito</a>
                """

                await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='HTML', disable_web_page_preview=True)

                try:
                  if image:
                    await bot.send_photo(chat_id=CHAT_ID, photo=image)
                except:
                  await bot.send_message(chat_id=CHAT_ID, text='Изображение не найдено')
                  continue

                supabase.table("mein-kun").update({"sended_to_telegram": True}).eq("title", title).execute()

                last_sent_time = current_time
                break

        await asyncio.sleep(10)

async def main():
    try:
        await send_start_message()

        await check_and_send()

    finally:
        await send_shutdown_message()

if __name__ == "__main__":
    asyncio.run(main())
