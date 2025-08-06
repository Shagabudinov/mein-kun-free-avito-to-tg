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
message_interval = 5  # секунд между сообщениями

async def send_start_message():
    try:
        await bot.send_message(chat_id=CHAT_ID, text="Бот запущен")
    except Exception as e:
        print("Ошибка отправки стартового сообщения:", e)

async def send_shutdown_message():
    try:
        await bot.send_message(chat_id=CHAT_ID, text="Бот отключен пользователем")
    except Exception as e:
        print("Ошибка отправки сообщения об отключении:", e)

async def check_and_send():
    global last_sent_time

    while True:
        current_time = time.time()

        if current_time - last_sent_time >= message_interval:
            response = supabase.table("hh-kaluga").select("id, title, money").eq("sended_to_telegram", False).execute()

            print(f'Response: {response.data} count={response.count}')

            for record in response.data:
                id = record['id']
                title = record['title']
                money = record['money']

                message = (
                    f"<b>{title}</b>\n\n"
                    f"Оплата: {money}\n\n"
                    f"<a href=\"https://hh.ru/vacancy/{id}\">Перейти на HH</a>"
                )

                # Обработка ошибок при отправке
                try:
                    await bot.send_message(
                        chat_id=CHAT_ID,
                        text=message,
                        parse_mode='HTML',
                        disable_web_page_preview=True
                    )
                    print(f"Отправлено: {title}")

                    supabase.table("hh-kaluga").update({"sended_to_telegram": True}).eq("id", id).execute()
                except Exception as e:
                    print(f"Ошибка при отправке вакансии '{title}':", e)
                    await asyncio.sleep(15)

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