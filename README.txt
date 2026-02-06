# DieoDex — AI Chat UI (placeholder)

Красивая заготовка чата под AI-агента (в стиле Codex), с анимациями, сессиями, экспортом и темами.
Сейчас ответы — заглушки. Позже подключишь OpenRouter (лучше через Cloudflare Worker).

## Файлы
- index.html — разметка
- style.css — дизайн + анимации
- app.js — логика чата (placeholder)

## Деплой
GitHub Pages: Settings → Pages → Deploy from a branch → main + /(root) → Save.
Cloudflare Pages: Drag&Drop папки/zip.

## Подключение OpenRouter (правильно)
Не вставляй API-ключ в фронт для публичного сайта.
Сделай Cloudflare Worker, где ключ хранится как Secret, и фронт делает fetch() к Worker.
