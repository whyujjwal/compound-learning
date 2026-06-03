# Docs

Use this folder for project documentation that should live with the codebase.

## Start here

- [Project structure](PROJECT_STRUCTURE.md) explains where code, docs, scripts, and generated files belong.
- [Google auth setup](GOOGLE_AUTH_SETUP.md) covers OAuth configuration.
- [Curriculum reference](CURRICULUM.md) is generated from `curriculum.json`.

## Product and design notes

- [Block briefing page design](superpowers/specs/2026-05-25-block-briefing-page-design.md)

## Generated curriculum

`CURRICULUM.md` is generated from `curriculum.json` with:

```bash
python docs/generate_curriculum.py
```
