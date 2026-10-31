# IntelliJ IDEA
Відкрити Git-корінь D:\hack1 через File → Open і вибрати pom.xml → Open as Project, або у вже відкритому проєкті правою кнопкою pom.xml → Add as Maven Project.
У корені тепер є агрегуючий Maven POM, який включає fixer/backend; Spring dependencies залишаються в fixer/backend/pom.xml.

1. File → Project Structure → Project → SDK: вибрати JDK 17. Якщо немає: Add SDK → JDK → C:\Program Files\Java\jdk-17. Language level: 17.
2. Settings → Build, Execution, Deployment → Build Tools → Maven: Maven home path = Wrapper; JDK for importer = Project JDK. У Maven → Runner: JRE = Project JDK.
3. Maven tool window → Reload All Maven Projects. Дочекатися завантаження залежностей та індексації.
4. Вибрати run configuration Fixer Backend і натиснути Run. Або відкрити fixer/backend/src/main/java/fixer/FixerApplication.java і запустити main.

Окремий Spring plugin для запуску не потрібен: звичайний Java main і Maven goal запускають Spring Boot. Розширені IDE-підказки Spring залежать від редакції IDEA.
Якщо раніше папку відкрили як звичайні файли, просто Reload без імпорту pom.xml не створить Maven module — спочатку Add as Maven Project.

## Запуск без налаштування IDE
З кореня D:\hack1 у PowerShell:
```powershell
./run-backend.ps1
./run-backend.ps1 test
```
Скрипт використовує встановлений JDK 17 і Maven Wrapper 3.9.9. Перший запуск потребує інтернету для завантаження Maven/dependencies. Системний Maven не потрібен.
Health: http://localhost:8080/api/health. Дані API поки визначає інтеграційна гілка Славіка.

Для всієї системи використовуйте D:\hack1\start.cmd: він запускає також AI Gemini та React. Ключ — fixer/.env, GEMINI_API_KEY. Окрема конфігурація Fixer Backend запускає лише Java.
