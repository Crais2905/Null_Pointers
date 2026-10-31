# NullPointers · Fixer

Код проєкту та інструкція запуску — у `fixer/README.md`.
Розподіл роботи чотирьох учасників — `fixer/docs/team.md`.

```powershell
cd fixer
./scripts/dev.ps1 setup
./scripts/dev.ps1 up
```

## IntelliJ / Java backend
Відкрити кореневий pom.xml як Maven project, вибрати JDK 17, Reload Maven. Конфігурація запуску: Fixer Backend. Деталі: fixer/docs/intellij.md. Без IDE: `./run-backend.ps1`; тести: `./run-backend.ps1 test`. Maven Wrapper завантажить Maven автоматично.

Карта папок і твоя зона роботи: fixer/docs/structure.md.
