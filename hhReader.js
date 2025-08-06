import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from './supabaseInit.js';

dotenv.config();

const keyWords = ['frontend', 'фронтенд', 'react'];

const stopWords = [
  'охрана', 'охранник', 'дом работница', 'дом работник', 'дворник', 'няня',
  'воспитатель', 'водитель', 'кладовщик', 'сантехник', 'кассир', 'грузчик',
  'экономист', 'бухгалтер', 'слесарь', 'автомеханик', 'бариста', 'официант',
  'плотник', 'монтажник', 'маляр', 'токарь', 'финансист', 'ремонтник', 'юрист',
  'электротехник', 'стоматолог', 'врач', 'медицинская сестра', 'медицинский брат',
  'санитарка', 'склад', 'сварщик', 'плиточник', 'литейщик', 'терапевт',
  'дорожный рабочий', 'повар', 'энергетик', 'машинист'
];

let pageNumber = 1;
const url = process.env.HH_SEARCH_URL;

const filterItems = (items) => {
  return items.filter((item) => {
    const title = item.name.toLowerCase();
    // Ключевые слова (любое)
    const hasKeyWord = true;//keyWords.some((key) => title.includes(key));
    // Стоп-слова (любое)
    const hasStopWord = stopWords.some((stopWord) => title.includes(stopWord));
    // Оставляем только те, что содержат ключевое слово и НЕ содержат стоп-слово
    return hasKeyWord && !hasStopWord;
  });
};

async function addToSupaBase(items) {
  const itemsToTable = items.map((item) => {
    const from = item?.compensation?.from;
    const to = item?.compensation?.to;
    const currency = item?.compensation?.currencyCode?.replace('RUR', 'RUB');
    const money = !from && !to
      ? 'Зп не указана'
      : from && !to
      ? `От ${from} ${currency}`
      : !from && to
      ? `До ${to} ${currency}`
      : `${from}-${to} ${currency}`;
    return {
      id: item.vacancyId,
      title: item.name,
      money: money,
      sended_to_telegram: false,
    };
  });

  if (itemsToTable.length > 0) {
    try {
      const existingItems = await supabase
        .from('hh-kaluga')
        .select('id, sended_to_telegram')
        .in(
          'id',
          itemsToTable.map((item) => item.id)
        )
        .eq('sended_to_telegram', true);

      const filteredItems = itemsToTable.filter((item) => {
        return !existingItems.data.some(
          (existingItem) => existingItem.id === item.id
        );
      });

      if (filteredItems.length > 0) {
        const { data, error } = await supabase
          .from('hh-kaluga')
          .upsert(filteredItems, { onConflict: 'id' });

        if (error) {
          console.error('Ошибка при добавлении в базу данных:', error);
        } else {
          console.log('Успешно добавлено в базу данных:', data);
        }
      } else {
        console.log(
          'Все записи с такими id уже имеют sended_to_telegram == true. Пропускаем.'
        );
      }
    } catch (error) {
      console.error('Ошибка при запросе в базу данных:', error);
    }
  } else {
    console.log('Нет данных для добавления.');
    pageNumber = 1;
  }
}

const getDataFromHH = () => {
  setInterval(async () => {
    try {
      // console.log(`${url}&page=${pageNumber}`);
      const response = await axios.get(`${url}`);
      pageNumber += 1;
      const items = response.data.vacancySearchResult.vacancies;
      console.log(`Вакансий всего: ${items.length}`);

      // Фильтруем данные
      const filteredItems = filterItems(items);
      console.log(`Вакансий после фильтрации: ${filteredItems.length}`);

      // Добавляем отфильтрованные данные в базу
      await addToSupaBase(filteredItems);

    } catch (error) {
      console.error('Ошибка при получении данных с HH:', error);
    }
  }, 60000);
};

getDataFromHH();
