import axios from 'axios';
import dotenv from 'dotenv';
import { supabase } from './supabaseInit.js';

dotenv.config();

let pageNumber = 1;
const url = process.env.AVITO_SEARCH_URL;

const filterItems = (items) => {
  return items.filter((item) => {
    const region = item.geo.formattedAddress.split(',')[0];
    return (
      item['priceDetailed']?.value < 6000 &&
      item['priceDetailed']?.value !== null &&
      region === 'Краснодарский край'
    );
  });
};

async function addToSupaBase(items) {
  const itemsToTable = items.map((item) => {
    return {
      id: item.id,
      url: item.urlPath,
      price: item.priceDetailed.value,
      title: item.title,
      description: item.description,
      sended_to_telegram: false,
      city: item.location.name,
      image: item.images[0]['864x864'],
    };
  });

  if (itemsToTable.length > 0) {
    try {
      // Проверяем наличие записей с таким id и sended_to_telegram == true
      const existingItems = await supabase
        .from('mein-kun')
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
          .from('mein-kun')
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

const getDataFromAvito = () => {
  setInterval(async () => {
    try {
      const response = await axios.get(`${url}&page=${pageNumber}`);
      pageNumber += 1;
      console.log(response.data.totalCount);
      const items = response.data.items;
      console.log(items.length);

      // Фильтруем данные
      const filteredItems = filterItems(items);

      // Добавляем отфильтрованные данные в базу
      await addToSupaBase(filteredItems);

      console.log(`Обработано ${filteredItems.length} элементов.`);
    } catch (error) {
      console.error('Ошибка при получении данных с Avito:', error);
    }
  }, 3000);
};

getDataFromAvito();
