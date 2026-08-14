Правь на месте при изменении кода, НЕ дописывай.

# CONTEXT — yaya-chicken-courier (приложение курьера)

## 1. Назначение репо
PWA-приложение курьера YaYa Chicken — принимает наряд (заказы, назначенные курьеру через KV yaya_order_couriers), показывает маршрут по карте, шлёт свою геопозицию на сервер, переключает статусы доставки. Фронтенд без сборки: вся логика в одном index.html; сервер общий — https://yaya-db-production.up.railway.app (репо yaya-db).

## 2. Стек и точка входа
Чистый HTML/CSS/JS (vanilla), Leaflet 1.9.4 (CDN) + OSM-тайлы, геокод Nominatim (openstreetmap.org), маршруты OSRM (router.project-osrm.org/trip/v1/driving, roundtrip=false, source=first, geojson). Точка входа — index.html; PWA-обвязка — manifest.json + sw.js.

## 3. Структура
- index.html — весь фронтенд курьера: авторизация, загрузка заказов, карта/маршрут, статусы доставки, геопозиция. API base задан здесь: index.html:253 `API='https://yaya-db-production.up.railway.app'`.
- manifest.json — PWA (name/start_url ./index.html, иконки icon-192/512.png, standalone).
- sw.js — service worker курьера.
- avatar.png — аватар курьера (маркер «Вы» на карте), icon-192.png/icon-512.png — иконки PWA.

## 4. Публичные интерфейсы (внешние связи)
Сервер один (yaya-db), роль курьера COURIER. Токен — KV-пары: POS_KEY='yaya_courier_pos', COUR_KEY='yaya_order_couriers', LIST_KEY='yaya_couriers' (index.html:254).
- GET /auth-check (index.html:313) — проверка/валидация ключа (X-Admin-Token), показывается роль курьера.
- GET /orders?limit=100 (index.html:409) — список заказов; курьер видит только свои (сервер фильтрует по X-Courier-Name или ?me). delivery_status подтягивается из KV yaya_order_couriers и накладывается на заказ (index.html:426-429).
- PUT /kv/yaya_order_couriers (хелпер put, index.html:283, с ретраями 3x900мс) — запись статуса доставки: cour[id]={courier:ME,delivery_status:st} (index.html:554). Это ЕДИНСТВЕННЫЙ канал смены статуса доставки; пуши клиенту сервер шлёт при on_way→'Курьер в пути' / delivered→'Заказ доставлен'.
- PUT /kv/yaya_courier_pos (sendPos) — геопозиция курьера (watchPosition, SEND_EVERY=15000, index.html:256/371-374).
- GET /kv/* (хелпер get, index.html:280) — чтение KV (список курьеров и т.п.).
- Входящие пуши (sw.js push handler) — сервер будит приложение о новых заказах/смене статусов.
- Заголовки: X-Admin-Token (ключ), X-Courier-Name (index.html:276, encodeURIComponent(ME)) — сервер идентифицирует курьера.
- GET /orders/:id/status НЕ используется — статусы доставки пишутся только в KV yaya_order_couriers.

## 5. Готчи
- Статус заказа на витрине (status: new/cook/done) от статуса доставки (delivery_status: assigned/on_way/delivered) отделён: доставку ведёт только KV yaya_order_couriers.
- X-Courier-Name — имя курьера (собственное поле, не токен); сервер нормализует сравнение (lowercase, ё→е, схлопывание пробелов).
- Гео — watchPosition каждые 15с (не высокочастотно), при недоступности GPS маркер «Вы» не двигается, но приложение работает (заказы/статусы).
- Маршрут — OSRM trip (оптимизация по точкам доставки), tiles OSM; sw.js пропускает все кросс-доменные запросы (url.origin!==self.location.origin — API/карты не кэшируются), SHELL (./, index.html, manifest.json, иконки) — network-first с фолбэком на кэш/./index.html, CACHE='yaya-courier-v1'.
- Вся логика в одном index.html — при правке index.html бампить версию кэша в sw.js (CACHE), иначе PWA продолжит отдавать старый снаряд.
