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
    #await bot.send_message(chat_id=CHAT_ID, text="Бот запущен")

async def send_shutdown_message():
    """Отправить сообщение при отключении бота"""
    #await bot.send_message(chat_id=CHAT_ID, text="Бот отключен пользователем")

async def check_and_send():
    global last_sent_time

    while True:
        current_time = time.time()

        if current_time - last_sent_time >= message_interval:
            response = supabase.table("hh-alice").select("id, title, money, req, resp, cond, skill").eq("sended_to_telegram", False).execute()

            print(f'Response: {response}')

            for record in response.data:
                id = record['id']
                title = record['title']
                money = record['money']
                req = record['req']
                resp = record['resp']
                cond = record['cond']
                skill = record['skill']




                message = f"""
                <b>{title}</b>
              
<b>Оплата:</b> {money}

<b>Требования:</b> {req}

<b>Рабочие задачи:</b> {resp}

<b>Что предлагаем:</b> {cond}

<b>Умения:</b> {skill}

<a href="https://hh.ru/vacancy/{id}">Перейти на HH</a>
                """

                await bot.send_message(chat_id=CHAT_ID, text=message, parse_mode='HTML')

                supabase.table("hh-alice").update({"sended_to_telegram": True}).eq("title", title).execute()

                last_sent_time = current_time
                break

        await asyncio.sleep(10)

async def main():
    try:
        #await send_start_message()

        await check_and_send()

    finally:
        await send_shutdown_message()

if __name__ == "__main__":
    asyncio.run(main())
