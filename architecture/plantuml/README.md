# C4 Architecture Diagrams — PlantUML Source

All diagrams use the official [C4-PlantUML](https://github.com/plantuml-stdlib/C4-PlantUML) library.

## Diagrams in this folder

| File | C4 Level | Shows |
|------|----------|-------|
| [c4-01-context.puml](c4-01-context.puml) | Level 1 — System Context | Who uses the system and what it touches |
| [c4-02-container.puml](c4-02-container.puml) | Level 2 — Container | Deployable units and their interactions |
| [c4-03-component.puml](c4-03-component.puml) | Level 3 — Component | Internal structure of the API backend |
| [c4-04-dynamic.puml](c4-04-dynamic.puml) | Dynamic — Sequence | Step-by-step RAG query flow |
| [c4-05-deployment.puml](c4-05-deployment.puml) | Deployment | Docker Compose infrastructure topology |
| [c4-06-code.puml](c4-06-code.puml) | Level 4 — Code | Key class relationships and API contracts |

---

## How to render

### Option 1 — VS Code (recommended for recording)
1. Install the **PlantUML** extension (jebbs.plantuml)
2. Install Java: `winget install Microsoft.OpenJDK.21`
3. Open any `.puml` file → press `Alt+D` to preview
4. Right-click preview → Save As PNG for LinkedIn posts

### Option 2 — Online (no install)
Paste any `.puml` file contents into:
- [PlantUML Web Server](https://www.plantuml.com/plantuml/uml/)
- [Kroki.io](https://kroki.io/) (supports more formats)

### Option 3 — CLI batch export
```powershell
# Requires Java + plantuml.jar
java -jar plantuml.jar -tpng "c:\Nagesh Project\Personal-Recruiter-Bot\architecture\plantuml\*.puml"
# Generates c4-01-context.png, c4-02-container.png, etc.
```

### Option 4 — GitHub rendering
Push this repo to GitHub. GitHub natively renders PlantUML in markdown
when you embed it in a code block tagged ```plantuml.

---

## C4 Model Quick Reference

```
Level 1 — Context    : WHO uses it and WHAT external systems it touches
Level 2 — Container  : WHAT deployable units exist and HOW they communicate
Level 3 — Component  : WHAT are the internal building blocks of each container
Level 4 — Code       : HOW key classes/interfaces relate (class diagrams)
Dynamic              : HOW the system behaves for a specific scenario (sequence)
Deployment           : WHERE the software runs (infrastructure topology)
```
