# OmniConvert Core

Complete library for file conversion in the browser without a server.

## Features

### 🖼️ Image Conversion
- **JPG ↔ PNG** - bidirectional conversion with transparency support
- **WebP ↔ JPG** - for compatibility and optimization
- **PNG → WebP** - modern format with better compression
- **JPG → WebP** - web optimization
- **HEIC → JPG** - photos from Apple devices (requires heic2any)
- **SVG → PNG** - vector graphics rasterization with size settings
- **JPG → PDF** - create PDF from images

### 📊 Data Conversion
- **CSV ↔ JSON** - bidirectional conversion with header support
- **XML ↔ JSON** - two-way structured data conversion
- **Markdown → HTML** - Markdown rendering with table and extension support

## Quick Start

```html
<script src="src/omni-convert.js"></script>
<script>
    const converter = new OmniConvert();
    
    // Convert JPG to PNG
    converter.jpgToPng(files).then(result => {
        console.log('Done!', result);
    });
</script>
```

## All Conversion Methods

```javascript
// Image conversion
await converter.jpgToPng(files);          // JPG → PNG
await converter.pngToJpg(files);          // PNG → JPG
await converter.webpToJpg(files);         // WebP → JPG
await converter.pngToWebp(files);         // PNG → WebP
await converter.jpgToWebp(files);         // JPG → WebP
await converter.heicToJpg(files);         // HEIC → JPG
await converter.svgToPng(files);          // SVG → PNG
await converter.jpgToPdf(files);          // JPG → PDF

// Data conversion
await converter.csvToJson(file);          // CSV → JSON
await converter.jsonToCsv(file);          // JSON → CSV
await converter.xmlToJson(file);          // XML → JSON
await converter.jsonToXml(file);          // JSON → XML
await converter.markdownToHtml(file);     // Markdown → HTML
```

## Configuration

```javascript
const converter = new OmniConvert({
    enableLogging: true,        // Enable logging
    autoDownload: true,         // Auto-download results
    progressCallback: (percentage, message) => {
        console.log(`${percentage}%: ${message}`);
    },
    errorCallback: (message, error) => {
        console.error('Error:', message, error);
    },
    successCallback: (message, data) => {
        console.log('Success:', message, data);
    }
});
```

## Detailed Conversion Options

### Image Conversion

#### PNG to JPG with background setting
```javascript
await converter.pngToJpg(files, {
    backgroundColor: '#ffffff',  // Background color for transparent areas
    quality: 0.9                 // JPG quality (0.1-1.0)
});
```

#### WebP conversion with quality
```javascript
// PNG to WebP
await converter.pngToWebp(files, { 
    quality: 0.8,               // Compression quality
    lossless: false             // Lossless (ignores quality)
});

// JPG to WebP
await converter.jpgToWebp(files, { 
    quality: 0.9 
});
```

#### HEIC conversion
```javascript
// Requires heic2any library
// <script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>
await converter.heicToJpg(files, { 
    quality: 0.9,
    format: 'JPEG'
});
```

#### SVG to PNG with settings
```javascript
await converter.svgToPng(files, {
    width: 512,                 // Result width
    height: 512,                // Result height
    scale: 2,                   // Scale for high resolution
    backgroundColor: '#ffffff'   // SVG background
});
```

#### JPG to PDF conversion
```javascript
await converter.jpgToPdf(files, {
    pageSize: 'A4',             // Page size: 'A4', 'Letter', etc.
    margin: 20,                 // Margin in points
    autoScale: true,            // Auto-scale images to fit page
    orientation: 'portrait'     // 'portrait' or 'landscape'
});
```

### Data Conversion

#### CSV to JSON
```javascript
await converter.csvToJson(file, {
    hasHeaders: true,           // First row contains headers
    delimiter: ',',             // CSV delimiter
    encoding: 'utf-8',          // File encoding
    skipEmptyLines: true        // Skip empty lines
});
```

#### JSON to CSV
```javascript
await converter.jsonToCsv(file, {
    headers: ['name', 'age'],   // Explicitly specify headers
    delimiter: ',',             // CSV delimiter
    includeHeaders: true,       // Include headers in result
    flattenObjects: true        // Flatten nested objects
});
```

#### XML to JSON
```javascript
await converter.xmlToJson(file, {
    attributePrefix: '@',        // Attribute prefix
    textNodeName: '#text',       // Text node name
    ignoreAttributes: false,     // Ignore attributes
    parseNumbers: true,          // Automatically parse numbers
    parseBooleans: true,         // Automatically parse booleans
    arrayMode: true              // Arrays for repeating elements
});
```

#### JSON to XML
```javascript
await converter.jsonToXml(file, {
    rootName: 'root',           // Root element name
    itemName: 'item',           // Array element name
    attributePrefix: '@',        // Attribute prefix in JSON
    textNodeName: '#text',       // Text node name
    pretty: true,               // Formatted output
    declaration: true           // Include XML declaration
});
```

#### Markdown to HTML
```javascript
await converter.markdownToHtml(file, {
    enableTables: true,          // Table support
    enableCodeBlocks: true,      // Code blocks with highlighting
    enableStrikethrough: true,   // Strikethrough ~~text~~
    enableTaskLists: true,       // Task lists - [ ] and - [x]
    enableAutoLinks: true,       // Automatic links
    enableLineBreaks: true       // Line breaks as <br>
});
```

## Batch Processing

```javascript
// Convert multiple files
const results = await converter.convertMultiple('jpg-to-png', files, {
    // Conversion options
});

// Result contains information about each file
results.forEach(result => {
    if (result.success) {
        console.log(`✓ ${result.file.name} converted successfully`);
    } else {
        console.log(`✗ ${result.file.name}: ${result.error}`);
    }
});
```

## Error Handling

```javascript
try {
    const result = await converter.jpgToPng(files);
    console.log('Conversion completed:', result);
} catch (error) {
    console.error('Conversion error:', error.message);
}

// Or via callback
const converter = new OmniConvert({
    errorCallback: (message, error) => {
        // Error handling
        console.error(`Error: ${message}`, error);
    },
    successCallback: (message, data) => {
        // Success handling
        console.log(`Success: ${message}`, data);
    }
});
```

## Advanced Usage

### Custom Converter Registration

```javascript
class CustomConverter extends BaseConverter {
    async convert(file) {
        // Your conversion logic
        return {
            filename: 'converted.txt',
            blob: new Blob(['converted content']),
            mimeType: 'text/plain'
        };
    }
}

// Registration
converter.registerConverter('custom', CustomConverter);

// Usage
await converter.convertFiles('custom', files);
```

### Creating Specialized Converter

```javascript
const imageConverter = converter.createConverter('jpg-to-png', {
    backgroundColor: '#ffffff',
    quality: 0.9
});

const result = await imageConverter.convert(file);
```

## Browser Compatibility

- **Chrome/Edge**: Full support for all features
- **Firefox**: Full support for all features  
- **Safari**: Full support (HEIC requires library)
- **Mobile**: Support for core features

## Dependencies

### Required
- None - library works without external dependencies

### Optional
- **heic2any** - for HEIC file conversion
- **PDF-lib** - for JPG to PDF conversion

```html
<!-- For HEIC support -->
<script src="https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js"></script>

<!-- For PDF support -->
<script src="https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js"></script>
```

## License

MIT License - use freely in any projects.
