# OmniConvert Core

Полная библиотека для конвертации файлов в браузере без сервера.

## Возможности

### 🖼️ Конвертация изображений
- **JPG ↔ PNG** - взаимная конвертация с поддержкой прозрачности
- **WebP ↔ JPG** - для совместимости и оптимизации
- **PNG → WebP** - современный формат с лучшим сжатием
- **JPG → WebP** - оптимизация для веб
- **HEIC → JPG** - фото с Apple устройств (требует heic2any)
- **SVG → PNG** - растеризация векторной графики с настройкой размеров
- **GIF ↔ MP4** - конвертация анимированных файлов в обе стороны
- **JPG → PDF** - создание PDF из изображений

### 📊 Конвертация данных
- **CSV ↔ JSON** - взаимная конвертация с поддержкой заголовков
- **XML ↔ JSON** - двусторонняя конвертация структурированных данных
- **Markdown → HTML** - рендеринг Markdown с поддержкой таблиц и расширений

### 🔧 Утилиты
- **Пакетная обработка** - конвертация множества файлов
- **Drag & Drop** - поддержка перетаскивания файлов
- **Автоматический UI** - создание интерфейса конвертера
- **Прогресс и логирование** - отслеживание процесса конвертации

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

## Все методы конвертации

```javascript
// Конвертация изображений
await converter.jpgToPng(files);          // JPG → PNG
await converter.pngToJpg(files);          // PNG → JPG
await converter.webpToJpg(files);         // WebP → JPG
await converter.pngToWebp(files);         // PNG → WebP
await converter.jpgToWebp(files);         // JPG → WebP
await converter.heicToJpg(files);         // HEIC → JPG
await converter.svgToPng(files);          // SVG → PNG
await converter.gifToMp4(files);          // GIF → MP4
await converter.mp4ToGif(files);          // MP4 → GIF
await converter.jpgToPdf(files);          // JPG → PDF

// Конвертация данных
await converter.csvToJson(file);          // CSV → JSON
await converter.jsonToCsv(file);          // JSON → CSV
await converter.xmlToJson(file);          // XML → JSON
await converter.jsonToXml(file);          // JSON → XML
await converter.markdownToHtml(file);     // Markdown → HTML
```

## Конфигурация

```javascript
const converter = new OmniConvert({
    enableLogging: true,        // Включить логи
    autoDownload: true,         // Автоскачивание результатов
    progressCallback: (percentage, message) => {
        console.log(`${percentage}%: ${message}`);
    },
    errorCallback: (message, error) => {
        console.error('Ошибка:', message, error);
    },
    successCallback: (message, data) => {
        console.log('Успех:', message, data);
    }
});
```

## Drag & Drop интерфейс

```javascript
// Настройка drag & drop для элемента
converter.setupDragDrop('#drop-zone', {
    onDrop: (files) => converter.jpgToPng(files),
    acceptedTypes: ['image/jpeg', 'image/png'],
    dropText: 'Перетащите файлы сюда',
    hoverText: 'Отпустите файлы для конвертации'
});
```

## Автоматическое создание UI

```javascript
// Создание готового интерфейса конвертера
converter.createUI('container', 'jpg-to-png', {
    title: 'Конвертер JPG в PNG',
    description: 'Конвертируйте JPG изображения в PNG формат',
    acceptedTypes: ['image/jpeg'],
    showProgress: true,
    showPreview: true
});
```

## Детальные опции конвертации

### Конвертация изображений

#### PNG в JPG с настройкой фона
```javascript
await converter.pngToJpg(files, {
    backgroundColor: '#ffffff',  // Цвет фона для прозрачных областей
    quality: 0.9                 // Качество JPG (0.1-1.0)
});
```

#### WebP конвертация с качеством
```javascript
// PNG в WebP
await converter.pngToWebp(files, { 
    quality: 0.8,               // Качество сжатия
    lossless: false             // Без потерь (игнорирует quality)
});

// JPG в WebP
await converter.jpgToWebp(files, { 
    quality: 0.9 
});
```

#### HEIC конвертация
```javascript
// Требует подключения heic2any библиотеки
// <script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>
await converter.heicToJpg(files, { 
    quality: 0.9,
    format: 'JPEG'
});
```

#### SVG в PNG с настройками
```javascript
await converter.svgToPng(files, {
    width: 512,                 // Ширина результата
    height: 512,                // Высота результата
    scale: 2,                   // Масштаб для высокого разрешения
    backgroundColor: '#ffffff'   // Фон SVG
});
```

#### GIF и MP4 конвертация
```javascript
// GIF в MP4
await converter.gifToMp4(files, { 
    fps: 15,                    // Частота кадров
    quality: 'medium'           // Качество: 'low', 'medium', 'high'
});

// MP4 в GIF
await converter.mp4ToGif(files, {
    fps: 10,                    // Частота кадров для GIF
    width: 480,                 // Ширина GIF
    startTime: 0,               // Начальное время (секунды)
    duration: 5                 // Длительность (секунды)
});

// Для лучшего результата подключите FFmpeg.js:
// <script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/umd/ffmpeg.js"></script>
```

### Конвертация данных

#### CSV в JSON
```javascript
await converter.csvToJson(file, {
    hasHeaders: true,           // Первая строка содержит заголовки
    delimiter: ',',             // Разделитель CSV
    encoding: 'utf-8',          // Кодировка файла
    skipEmptyLines: true        // Пропускать пустые строки
});
```

#### JSON в CSV
```javascript
await converter.jsonToCsv(file, {
    headers: ['name', 'age'],   // Явно указать заголовки
    delimiter: ',',             // Разделитель CSV
    includeHeaders: true,       // Включить заголовки в результат
    flattenObjects: true        // Разворачивать вложенные объекты
});
```

#### XML в JSON
```javascript
await converter.xmlToJson(file, {
    attributePrefix: '@',        // Префикс для атрибутов
    textNodeName: '#text',       // Имя для текстовых узлов
    ignoreAttributes: false,     // Игнорировать атрибуты
    parseNumbers: true,          // Автоматически парсить числа
    parseBooleans: true,         // Автоматически парсить булевы значения
    arrayMode: true              // Массивы для повторяющихся элементов
});
```

#### JSON в XML
```javascript
await converter.jsonToXml(file, {
    rootName: 'root',           // Имя корневого элемента
    itemName: 'item',           // Имя для элементов массива
    attributePrefix: '@',        // Префикс атрибутов в JSON
    textNodeName: '#text',       // Имя текстовых узлов
    pretty: true,               // Форматированный вывод
    declaration: true           // Включить XML декларацию
});
```

#### Markdown в HTML
```javascript
await converter.markdownToHtml(file, {
    enableTables: true,          // Поддержка таблиц
    enableCodeBlocks: true,      // Блоки кода с подсветкой
    enableStrikethrough: true,   // Зачеркивание ~~text~~
    enableTaskLists: true,       // Списки задач - [ ] и - [x]
    enableAutoLinks: true,       // Автоматические ссылки
    enableLineBreaks: true       // Переносы строк как <br>
});
```

## Пакетная обработка

```javascript
// Конвертация нескольких файлов
const results = await converter.convertMultiple('jpg-to-png', files, {
    // Опции конвертации
});

// Результат содержит информацию о каждом файле
results.forEach(result => {
    if (result.success) {
        console.log(`✓ ${result.file.name} конвертирован успешно`);
    } else {
        console.log(`✗ ${result.file.name}: ${result.error}`);
    }
});
```

## Утилиты

```javascript
// Получить список поддерживаемых форматов
const formats = OmniConvert.getSupportedFormats();
console.log(formats);

// Создать экземпляр с заводскими настройками
const converter = OmniConvert.create({
    enableLogging: true
});

// Генерация имени файла
const filename = OmniConvert.generateFilename('photo.jpg', 'png');
// Результат: photo-converted-2024-01-01T12-00-00.png

// Форматирование размера файла
const size = OmniConvert.formatFileSize(1024000);
// Результат: 1000.00 KB

// Валидация типа файла
const isValid = OmniConvert.validateFileType(file, ['image/jpeg', 'image/png']);
```

## Обработка ошибок

```javascript
try {
    const result = await converter.jpgToPng(files);
    console.log('Конвертация завершена:', result);
} catch (error) {
    console.error('Ошибка конвертации:', error.message);
}

// Или через callback
const converter = new OmniConvert({
    errorCallback: (message, error) => {
        // Обработка ошибок
        console.error(`Ошибка: ${message}`, error);
    },
    successCallback: (message, data) => {
        // Обработка успешного результата
        console.log(`Успех: ${message}`, data);
    }
});
```

## Расширенное использование

### Регистрация собственных конвертеров

```javascript
class CustomConverter extends BaseConverter {
    async convert(file) {
        // Ваша логика конвертации
        return {
            filename: 'converted.txt',
            blob: new Blob(['converted content']),
            mimeType: 'text/plain'
        };
    }
}

// Регистрация
converter.registerConverter('custom', CustomConverter);

// Использование
await converter.convertFiles('custom', files);
```

### Создание специализированного конвертера

```javascript
const imageConverter = converter.createConverter('jpg-to-png', {
    backgroundColor: '#ffffff',
    quality: 0.9
});

const result = await imageConverter.convert(file);
```

## Браузерная совместимость

- **Chrome/Edge**: Полная поддержка всех функций
- **Firefox**: Полная поддержка всех функций  
- **Safari**: Полная поддержка (HEIC требует библиотеку)
- **Mobile**: Поддержка основных функций

## Зависимости

### Обязательные
- Отсутствуют - библиотека работает без внешних зависимостей

### Опциональные
- **heic2any** - для конвертации HEIC файлов
- **FFmpeg.js** - для расширенной работы с видео/GIF

```html
<!-- Для HEIC поддержки -->
<script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>

<!-- Для улучшенной работы с видео -->
<script src="https://unpkg.com/@ffmpeg/ffmpeg@0.12.7/dist/umd/ffmpeg.js"></script>
```

## Лицензия

MIT License - используйте свободно в любых проектах.
