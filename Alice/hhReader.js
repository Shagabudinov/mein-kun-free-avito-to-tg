import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from './supabaseInit.js';

const keyWords = ['frontend', 'фронтенд', 'react'];

dotenv.config();

let pageNumber = 1;
const url = process.env.HH_SEARCH_URL;

const filterItems = (items) => {
  return items.filter((item) => {
    const title = item.name.toLowerCase();
    return (
      title.includes(keyWords[0]) ||
      title.includes(keyWords[1]) ||
      title.includes(keyWords[2])
    );
  });
};

async function addToSupaBase(items) {
  const itemsToTable = items.map((item) => {
    const from = item?.compensation?.from;
    const to = item?.compensation?.to;
    const currency = item?.compensation?.currencyCode?.replace('RUR', 'RUB');
    const money =
      !from && !to
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
      // Добавлены новые поля из объекта snippet
      req: item.snippet?.req || 'Не указаны',
      resp: item.snippet?.resp || 'Не указаны',
      cond: item.snippet?.cond || 'Не указано',
      skill: item.snippet?.skill || 'Не указаны',
      sended_to_telegram: false,
    };
  });

  if (itemsToTable.length > 0) {
    try {
      // Проверяем наличие записей с таким id и sended_to_telegram == true
      const existingItems = await supabase
        .from('hh-alice')
        .select('id, sended_to_telegram')
        .in(
          'id',
          itemsToTable.map((item) => item.id)
        )
        .eq('sended_to_telegram', true);

      // Фильтруем те элементы, которые уже имеют sended_to_telegram == true
      const filteredItems = itemsToTable.filter((item) => {
        return !existingItems.data.some(
          (existingItem) => existingItem.id === item.id
        );
      });

      if (filteredItems.length > 0) {
        const { data, error } = await supabase
          .from('hh-alice')
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
      //console.log(`${url}&page=${pageNumber}`);
      const response = await axios.get(`${url}`);
      pageNumber += 1;
      const items = response.data.vacancySearchResult.vacancies;
      console.log(`Вакансий всего: ${items.length}`);

      // Фильтруем данные
      //const filteredItems = filterItems(items);
      const filteredItems = items;
      console.log(`Вакансий для frontend: ${filteredItems.length}`);

      // Добавляем отфильтрованные данные в базу
      await addToSupaBase(filteredItems);

      //console.log(`Обработано ${filteredItems.length} элементов.`);
    } catch (error) {
      console.error('Ошибка при получении данных с Avito:', error);
    }
  }, 60000);
};


getDataFromHH();
