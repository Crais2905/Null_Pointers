# Fixer · NullPointers
AI-тріаж логів: React → Java/Spring Boot → Python/Gemini.

## Запуск Windows
Двічі натисніть **start.cmd** або виконайте в PowerShell:
```powershell
cd D:\hack1
.\start.ps1
```
Потрібні Python 3.11+ і JDK 17+. На цьому комп’ютері вони встановлені. Лаунчер сам знайде Python/JDK, підготує локальне AI-оточення, Node/npm/Maven за потреби, встановить залежності та запустить три сервіси. Перший запуск потребує інтернету; системний Maven/npm не потрібен. Браузер відкриється після готовності серверів.

## Куди вставити Gemini API key
Відкрити **fixer/.env**, вставити ключ тільки після знака =:
```dotenv
GEMINI_API_KEY=ваш_ключ
LLM_MODEL=gemini-3.5-flash-lite
REPLAY=auto
```
Ключ створюється в https://aistudio.google.com/apikey. Не вставляйте ключ у React, Java або Git. .env ігнорується Git; шаблон .env.example залишається без секрету.
Без ключа auto запускає офлайн-демо з кешем; із ключем — живий Gemini. Після редагування .env перезапустити start.cmd. Примусове демо: `.\start.ps1 -Replay`. Для живих запитів потрібні доступна модель, мережа й квота Google; платні виклики під час розробки тут не виконувались.

## Адреси та зупинка
- Frontend: http://localhost:5173/?api=java
- Java: http://localhost:8080/api/health
- AI: http://localhost:8000/health та /docs
- Ctrl+C у вікні запуску зупиняє всі три процеси; журнали — .build/logs/.
Зайнятий порт не перехоплюється: зупиніть старий запуск через IntelliJ/його термінал. Лаунчер не вбиває сторонні сервери.

## Перевірки
```powershell
.\start.ps1 -Test
.\start.ps1 -SetupOnly
```
Test примусово використовує replay та запускає JUnit, pytest і TypeScript/Vite build без живих Gemini-викликів. Варіант без браузера: `-NoBrowser`.

Карта структури: fixer/docs/structure.md; інтеграція даних: fixer/docs/mykola-handoff.md. Maven-проєкт IntelliJ — кореневий pom.xml. Лаунчер запускає і Java, і Python; Fixer Backend в IntelliJ запускає тільки Java.
