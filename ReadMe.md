# OmniConvert Core

Полная библиотека для конвертации файлов в браузере без сервера.

## Возможности

### 🖼️ Конвертация изображений
- **JPG → PNG** - с поддержкой прозрачности
- **PNG → JPG** - с настраиваемым фоном
- **WebP → JPG** - для совместимости
- **JPG → PDF** - создание PDF из изображений
- **Изменение размера** - с сохранением пропорций

### 📊 Конвертация данных
- **CSV → JSON** - с поддержкой заголовков
- **JSON → CSV** - с экранированием данных
- **Base64** - кодирование/декодирование

## Быстрый старт

```html
<script src="src/omni-convert.js"></script>
<script>
    const converter = new OmniConvert();
    
    // Конвертация JPG в PNG
    converter.jpgToPng(files).then(result => {
        console.log('Готово!', result);
    });
</script>
```

## Основные методы

```javascript
// Конвертация изображений
await converter.jpgToPng(files);
await converter.pngToJpg(files);
await converter.webpToJpg(files);
await converter.jpgToPdf(files);
await converter.resizeImages(files, { percentage: 50 });

// Конвертация данных
await converter.csvToJson(file);
await converter.jsonToCsv(file);
await converter.encodeBase64(file);
await converter.decodeBase64(file);
```

## Опции

```javascript
const converter = new OmniConvert({
    enableLogging: true,        // Включить логи
    autoDownload: true,         // Автоскачивание
    progressCallback: (p) => {}, // Прогресс
    errorCallback: (e) => {},   // Ошибки
    successCallback: (s) => {}  // Успех
});
```

## Drag & Drop

```javascript
// Настройка drag & drop для элемента
converter.setupDragDrop(element, {
    onDrop: (files) => converter.jpgToPng(files),
    acceptedTypes: ['image/jpeg', 'image/png']
});
```

## Создание UI

```javascript
// Автоматическое создание интерфейса
converter.createUI('container', 'jpg-to-png', {
    title: 'Конвертер JPG в PNG',
    acceptedTypes: ['image/jpeg'],
    showProgress: true
});
```
