/**
 * OmniConvert - Полная библиотека для конвертации файлов в браузере
 * @version 1.0.0
 * @license MIT
 * 
 * Использование:
 * <script src="omni-convert.js"></script>
 * <script>
 *   const converter = new OmniConvert();
 *   converter.jpgToPng(files);
 * </script>
 */

(function() {
    'use strict';

    /**
     * Базовый класс OmniConvert Core
     */
    class OmniConvertCore {
        constructor(options = {}) {
            this.options = {
                enableLogging: options.enableLogging || false,
                autoDownload: options.autoDownload !== false,
                progressCallback: options.progressCallback || null,
                errorCallback: options.errorCallback || null,
                successCallback: options.successCallback || null,
                ...options
            };
            
            this.converters = new Map();
            this.isInitialized = false;
            
            this.log('OmniConvert Core initialized');
        }

        log(message, data = null) {
            if (this.options.enableLogging) {
                console.log(`[OmniConvert] ${message}`, data || '');
            }
        }

        error(message, error = null) {
            const errorMsg = `[OmniConvert Error] ${message}`;
            console.error(errorMsg, error || '');
            
            if (this.options.errorCallback) {
                this.options.errorCallback(message, error);
            }
        }

        success(message, data = null) {
            this.log(`Success: ${message}`, data);
            
            if (this.options.successCallback) {
                this.options.successCallback(message, data);
            }
        }

        progress(percentage, message = '') {
            if (this.options.progressCallback) {
                this.options.progressCallback(percentage, message);
            }
        }

        // Register a converter
        registerConverter(name, converterClass) {
            this.converters.set(name, converterClass);
            this.log(`Registered converter: ${name}`);
        }

        // Get available converters
        getAvailableConverters() {
            return Array.from(this.converters.keys());
        }

        // Create converter instance
        createConverter(type, options = {}) {
            const ConverterClass = this.converters.get(type);
            if (!ConverterClass) {
                throw new Error(`Converter '${type}' not found. Available: ${this.getAvailableConverters().join(', ')}`);
            }
            
            const mergedOptions = { ...this.options, ...options };
            return new ConverterClass(mergedOptions);
        }

        // Utility methods
        static generateFilename(originalName, newExtension) {
            const baseName = originalName.substring(0, originalName.lastIndexOf('.')) || originalName;
            const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
            return `${baseName}-converted-${timestamp}.${newExtension}`;
        }

        static formatFileSize(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }

        static validateFileType(file, allowedTypes) {
            return allowedTypes.some(type => {
                if (type.includes('/')) {
                    return file.type === type;
                } else {
                    return file.name.toLowerCase().endsWith(type.toLowerCase());
                }
            });
        }

        static downloadFile(data, filename, mimeType = 'application/octet-stream') {
            const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }

        static async delay(ms) {
            return new Promise(resolve => setTimeout(resolve, ms));
        }

        // Batch conversion utility
        async convertMultiple(type, files, options = {}) {
            const converter = this.createConverter(type, options);
            const results = [];
            
            for (let i = 0; i < files.length; i++) {
                try {
                    this.progress((i / files.length) * 100, `Converting ${files[i].name}`);
                    const result = await converter.convert(files[i]);
                    results.push({ success: true, file: files[i], result });
                    
                    if (this.options.autoDownload && result.blob) {
                        OmniConvertCore.downloadFile(result.blob, result.filename, result.mimeType);
                    }
                } catch (error) {
                    results.push({ success: false, file: files[i], error: error.message });
                    this.error(`Failed to convert ${files[i].name}`, error);
                }
            }
            
            this.progress(100, 'Conversion complete');
            this.success(`Converted ${results.filter(r => r.success).length}/${files.length} files`);
            
            return results;
        }
    }

    /**
     * Базовый класс для всех конвертеров
     */
    class BaseConverter {
        constructor(options = {}) {
            this.options = options;
        }

        log(message, data = null) {
            if (this.options.enableLogging) {
                console.log(`[${this.constructor.name}] ${message}`, data || '');
            }
        }

        async convert(file) {
            throw new Error('Convert method must be implemented by subclass');
        }

        validateFile(file, allowedTypes) {
            if (!OmniConvertCore.validateFileType(file, allowedTypes)) {
                throw new Error(`Invalid file type. Expected: ${allowedTypes.join(', ')}`);
            }
        }

        async loadImage(file) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
                img.src = URL.createObjectURL(file);
            });
        }

        createCanvas(width, height) {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            return canvas;
        }
    }

    /**
     * КОНВЕРТЕРЫ ИЗОБРАЖЕНИЙ
     */

    // JPG to PNG Converter
    class JpgToPngConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/jpeg', 'image/jpg', '.jpg', '.jpeg'];
            this.outputType = 'image/png';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from JPG to PNG`);

            const img = await this.loadImage(file);
            const canvas = this.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            // Fill with white background for transparency support
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(img.src);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.outputType, 1.0);
            });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'png'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size
            };
        }
    }

    // PNG to JPG Converter
    class PngToJpgConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/png', '.png'];
            this.outputType = 'image/jpeg';
            this.quality = options.quality || 0.9;
            this.backgroundColor = options.backgroundColor || '#FFFFFF';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from PNG to JPG`);

            const img = await this.loadImage(file);
            const canvas = this.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            // Fill background color (important for PNG transparency)
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(img.src);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.outputType, this.quality);
            });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'jpg'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                quality: this.quality
            };
        }
    }

    // WebP to JPG Converter
    class WebpToJpgConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/webp', '.webp'];
            this.outputType = 'image/jpeg';
            this.quality = options.quality || 0.9;
            this.backgroundColor = options.backgroundColor || '#FFFFFF';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from WebP to JPG`);

            const img = await this.loadImage(file);
            const canvas = this.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            // Fill background color (important for WebP transparency)
            ctx.fillStyle = this.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);

            URL.revokeObjectURL(img.src);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.outputType, this.quality);
            });

            if (!blob) {
                throw new Error('Failed to convert WebP to JPG. Browser may not support WebP format.');
            }

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'jpg'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                quality: this.quality
            };
        }
    }

    // Image Resizer
    class ImageResizer extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', '.jpg', '.jpeg', '.png', '.webp'];
            this.resizeMode = options.resizeMode || 'percentage'; // 'percentage' or 'dimensions'
            this.percentage = options.percentage || 50;
            this.width = options.width || 800;
            this.height = options.height || 600;
            this.maintainAspectRatio = options.maintainAspectRatio !== false;
            this.quality = options.quality || 0.9;
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Resizing ${file.name}`);

            const img = await this.loadImage(file);
            let newWidth, newHeight;

            if (this.resizeMode === 'percentage') {
                newWidth = Math.round(img.width * (this.percentage / 100));
                newHeight = Math.round(img.height * (this.percentage / 100));
            } else {
                newWidth = this.width;
                newHeight = this.height;

                if (this.maintainAspectRatio) {
                    const aspectRatio = img.width / img.height;
                    if (newWidth / newHeight > aspectRatio) {
                        newWidth = Math.round(newHeight * aspectRatio);
                    } else {
                        newHeight = Math.round(newWidth / aspectRatio);
                    }
                }
            }

            const canvas = this.createCanvas(newWidth, newHeight);
            const ctx = canvas.getContext('2d');

            // Enable smooth scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, newWidth, newHeight);

            URL.revokeObjectURL(img.src);

            // Determine output format
            let mimeType = file.type;
            if (!mimeType || mimeType === 'image/webp') {
                mimeType = 'image/jpeg';
            }

            const blob = await new Promise(resolve => {
                if (mimeType === 'image/png') {
                    canvas.toBlob(resolve, mimeType);
                } else {
                    canvas.toBlob(resolve, mimeType, this.quality);
                }
            });

            // Generate filename with size info
            const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
            const extension = file.name.substring(file.name.lastIndexOf('.')) || '.jpg';
            const filename = `${baseName}_${newWidth}x${newHeight}${extension}`;

            return {
                blob,
                filename,
                mimeType,
                originalSize: file.size,
                newSize: blob.size,
                originalDimensions: { width: img.width, height: img.height },
                newDimensions: { width: newWidth, height: newHeight },
                resizeMode: this.resizeMode,
                quality: this.quality
            };
        }
    }

    // JPG to PDF Converter (requires PDF-lib)
    class JpgToPdfConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/jpeg', 'image/jpg', '.jpg', '.jpeg'];
            this.outputType = 'application/pdf';
            
            if (typeof PDFLib === 'undefined' && typeof window !== 'undefined') {
                console.warn('PDF-lib not found. Please include PDF-lib library for JPG to PDF conversion.');
            }
        }

        async convert(files) {
            // Handle both single file and array
            const fileList = Array.isArray(files) ? files : [files];
            
            if (typeof PDFLib === 'undefined') {
                throw new Error('PDF-lib library is required for JPG to PDF conversion. Please include it in your page.');
            }

            this.log(`Converting ${fileList.length} JPG file(s) to PDF`);

            const pdfDoc = await PDFLib.PDFDocument.create();

            for (const file of fileList) {
                this.validateFile(file, this.supportedInputs);
                
                const arrayBuffer = await file.arrayBuffer();
                let image;
                
                try {
                    image = await pdfDoc.embedJpg(arrayBuffer);
                } catch (jpgError) {
                    try {
                        image = await pdfDoc.embedPng(arrayBuffer);
                    } catch (pngError) {
                        throw new Error(`Unable to process image: ${file.name}`);
                    }
                }

                // Calculate page size to fit image
                const { width, height } = image;
                const maxWidth = 595; // A4 width in points
                const maxHeight = 842; // A4 height in points

                let pageWidth = width;
                let pageHeight = height;

                // Scale down if image is too large
                if (width > maxWidth || height > maxHeight) {
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const ratio = Math.min(widthRatio, heightRatio);

                    pageWidth = width * ratio;
                    pageHeight = height * ratio;
                }

                // Create page and add image
                const page = pdfDoc.addPage([pageWidth, pageHeight]);
                page.drawImage(image, {
                    x: 0,
                    y: 0,
                    width: pageWidth,
                    height: pageHeight,
                });
            }

            const pdfBytes = await pdfDoc.save();
            const blob = new Blob([pdfBytes], { type: this.outputType });

            const filename = fileList.length === 1 
                ? OmniConvertCore.generateFilename(fileList[0].name, 'pdf')
                : `converted-images-${new Date().toISOString().slice(0, 10)}.pdf`;

            return {
                blob,
                filename,
                mimeType: this.outputType,
                originalSize: fileList.reduce((sum, file) => sum + file.size, 0),
                newSize: blob.size,
                pageCount: fileList.length
            };
        }
    }

    /**
     * КОНВЕРТЕРЫ ДАННЫХ
     */

    // CSV to JSON Converter
    class CsvToJsonConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['text/csv', 'application/csv', '.csv'];
            this.outputType = 'application/json';
            this.delimiter = options.delimiter || ',';
            this.hasHeader = options.hasHeader !== false;
            this.encoding = options.encoding || 'utf-8';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from CSV to JSON`);

            const text = await file.text();
            const csvData = this.parseCSVText(text);

            if (csvData.length === 0) {
                throw new Error('CSV file appears to be empty or invalid');
            }

            let jsonData;

            if (this.hasHeader && csvData.length > 1) {
                // Use first row as headers
                const headers = csvData[0];
                const dataRows = csvData.slice(1);

                jsonData = dataRows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
            } else {
                // No headers, create array of arrays
                jsonData = csvData;
            }

            const jsonString = JSON.stringify(jsonData, null, 2);
            const blob = new Blob([jsonString], { type: this.outputType });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'json'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                recordCount: jsonData.length,
                hasHeader: this.hasHeader,
                delimiter: this.delimiter
            };
        }

        parseCSVText(text) {
            const lines = text.trim().split('\n');
            const result = [];

            for (const line of lines) {
                if (line.trim() === '') continue;
                const row = this.parseCSVLine(line);
                result.push(row);
            }

            return result;
        }

        parseCSVLine(line) {
            const result = [];
            let current = '';
            let inQuotes = false;

            for (let i = 0; i < line.length; i++) {
                const char = line[i];

                if (char === '"') {
                    inQuotes = !inQuotes;
                } else if (char === this.delimiter && !inQuotes) {
                    result.push(current.trim());
                    current = '';
                } else {
                    current += char;
                }
            }

            result.push(current.trim());
            return result;
        }

        // Static method to preview CSV data
        static async previewCSV(file, options = {}) {
            const converter = new CsvToJsonConverter(options);
            const text = await file.text();
            const csvData = converter.parseCSVText(text);
            
            const maxRows = Math.min(options.previewRows || 5, csvData.length);
            const headers = options.hasHeader !== false ? csvData[0] : csvData[0]?.map((_, i) => `Column ${i + 1}`);
            const dataRows = options.hasHeader !== false ? csvData.slice(1, maxRows + 1) : csvData.slice(0, maxRows);

            return {
                headers,
                dataRows,
                totalRows: csvData.length,
                totalColumns: csvData[0]?.length || 0
            };
        }
    }

    // JSON to CSV Converter
    class JsonToCsvConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['application/json', '.json'];
            this.outputType = 'text/csv';
            this.delimiter = options.delimiter || ',';
            this.includeHeader = options.includeHeader !== false;
            this.encoding = options.encoding || 'utf-8';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from JSON to CSV`);

            const text = await file.text();
            let jsonData;

            try {
                jsonData = JSON.parse(text);
            } catch (error) {
                throw new Error(`Invalid JSON file: ${error.message}`);
            }

            if (!Array.isArray(jsonData)) {
                throw new Error('JSON must be an array of objects or arrays');
            }

            if (jsonData.length === 0) {
                throw new Error('JSON array is empty');
            }

            let csvContent = '';

            // Handle array of objects
            if (typeof jsonData[0] === 'object' && !Array.isArray(jsonData[0])) {
                const headers = Object.keys(jsonData[0]);
                
                if (this.includeHeader) {
                    csvContent += this.escapeCSVRow(headers) + '\n';
                }

                for (const row of jsonData) {
                    const values = headers.map(header => row[header] || '');
                    csvContent += this.escapeCSVRow(values) + '\n';
                }
            }
            // Handle array of arrays
            else if (Array.isArray(jsonData[0])) {
                for (const row of jsonData) {
                    csvContent += this.escapeCSVRow(row) + '\n';
                }
            }
            else {
                throw new Error('Unsupported JSON structure. Expected array of objects or array of arrays.');
            }

            const blob = new Blob([csvContent], { type: this.outputType });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'csv'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                recordCount: jsonData.length,
                delimiter: this.delimiter
            };
        }

        escapeCSVRow(row) {
            return row.map(value => {
                const str = String(value || '');
                // Escape values containing delimiter, quotes, or newlines
                if (str.includes(this.delimiter) || str.includes('"') || str.includes('\n')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            }).join(this.delimiter);
        }
    }

    // Base64 Encoder/Decoder
    class Base64Converter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.operation = options.operation || 'encode'; // 'encode' or 'decode'
            this.outputFormat = options.outputFormat || 'text/plain';
        }

        async convert(file) {
            this.log(`${this.operation === 'encode' ? 'Encoding' : 'Decoding'} ${file.name} with Base64`);

            if (this.operation === 'encode') {
                return this.encode(file);
            } else {
                return this.decode(file);
            }
        }

        async encode(file) {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            let binary = '';
            
            for (let i = 0; i < bytes.byteLength; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            
            const base64 = btoa(binary);
            const blob = new Blob([base64], { type: 'text/plain' });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'txt'),
                mimeType: 'text/plain',
                originalSize: file.size,
                newSize: blob.size,
                operation: 'encode'
            };
        }

        async decode(file) {
            const text = await file.text();
            
            try {
                const binary = atob(text.trim());
                const bytes = new Uint8Array(binary.length);
                
                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }
                
                const blob = new Blob([bytes], { type: this.outputFormat });
                
                return {
                    blob,
                    filename: OmniConvertCore.generateFilename(file.name, 'bin'),
                    mimeType: this.outputFormat,
                    originalSize: file.size,
                    newSize: blob.size,
                    operation: 'decode'
                };
            } catch (error) {
                throw new Error(`Invalid Base64 data: ${error.message}`);
            }
        }
    }

    /**
     * ГЛАВНЫЙ КЛАСС OMNICONVERT
     */
    class OmniConvert extends OmniConvertCore {
        constructor(options = {}) {
            super(options);
            
            // Register all available converters
            this.registerAllConverters();
            
            // Setup UI helpers if in browser environment
            if (typeof document !== 'undefined') {
                this.setupDragDrop();
            }
            
            this.log('OmniConvert initialized with all converters');
        }

        registerAllConverters() {
            // Image converters
            this.registerConverter('jpg-to-png', JpgToPngConverter);
            this.registerConverter('png-to-jpg', PngToJpgConverter);
            this.registerConverter('webp-to-jpg', WebpToJpgConverter);
            this.registerConverter('jpg-to-pdf', JpgToPdfConverter);
            this.registerConverter('image-resize', ImageResizer);
            
            // Data converters
            this.registerConverter('csv-to-json', CsvToJsonConverter);
            this.registerConverter('json-to-csv', JsonToCsvConverter);
            this.registerConverter('base64', Base64Converter);
        }

        // Удобные методы для популярных конвертаций
        async jpgToPng(files, options = {}) {
            return this.convertFiles('jpg-to-png', files, options);
        }

        async pngToJpg(files, options = {}) {
            return this.convertFiles('png-to-jpg', files, options);
        }

        async webpToJpg(files, options = {}) {
            return this.convertFiles('webp-to-jpg', files, options);
        }

        async jpgToPdf(files, options = {}) {
            const converter = this.createConverter('jpg-to-pdf', options);
            return converter.convert(files);
        }

        async resizeImages(files, options = {}) {
            return this.convertFiles('image-resize', files, options);
        }

        async csvToJson(file, options = {}) {
            const converter = this.createConverter('csv-to-json', options);
            return converter.convert(file);
        }

        async jsonToCsv(file, options = {}) {
            const converter = this.createConverter('json-to-csv', options);
            return converter.convert(file);
        }

        async encodeBase64(file, options = {}) {
            const converter = this.createConverter('base64', { ...options, operation: 'encode' });
            return converter.convert(file);
        }

        async decodeBase64(file, options = {}) {
            const converter = this.createConverter('base64', { ...options, operation: 'decode' });
            return converter.convert(file);
        }

        // Helper method for single/multiple file conversion
        async convertFiles(converterType, files, options = {}) {
            const fileList = Array.isArray(files) ? files : [files];
            const converter = this.createConverter(converterType, options);
            
            if (fileList.length === 1) {
                return converter.convert(fileList[0]);
            } else {
                return this.convertMultiple(converterType, fileList, options);
            }
        }

        // UI Helper: Setup drag and drop for any element
        setupDragDrop(element = document.body, options = {}) {
            if (typeof document === 'undefined') return;

            const dropZone = element;
            const {
                onDrop = null,
                onDragOver = null,
                onDragLeave = null,
                acceptedTypes = [],
                highlightClass = 'drag-over'
            } = options;

            // Prevent default drag behaviors
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
                dropZone.addEventListener(eventName, this.preventDefaults, false);
                document.body.addEventListener(eventName, this.preventDefaults, false);
            });

            // Highlight drop area when item is dragged over it
            dropZone.addEventListener('dragover', (e) => {
                dropZone.classList.add(highlightClass);
                if (onDragOver) onDragOver(e);
            });

            dropZone.addEventListener('dragleave', (e) => {
                dropZone.classList.remove(highlightClass);
                if (onDragLeave) onDragLeave(e);
            });

            // Handle dropped files
            dropZone.addEventListener('drop', (e) => {
                dropZone.classList.remove(highlightClass);
                const files = Array.from(e.dataTransfer.files);
                
                let filteredFiles = files;
                if (acceptedTypes.length > 0) {
                    filteredFiles = files.filter(file => 
                        OmniConvertCore.validateFileType(file, acceptedTypes)
                    );
                }
                
                if (onDrop) {
                    onDrop(filteredFiles, e);
                } else {
                    this.log(`Dropped ${filteredFiles.length} file(s)`, filteredFiles);
                }
            });
        }

        preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }

        // UI Helper: Create a simple conversion interface
        createUI(containerId, converterType, options = {}) {
            if (typeof document === 'undefined') {
                throw new Error('createUI is only available in browser environment');
            }

            const container = document.getElementById(containerId);
            if (!container) {
                throw new Error(`Container with id '${containerId}' not found`);
            }

            const {
                title = `${converterType} Converter`,
                acceptedTypes = [],
                multiple = true,
                showProgress = true,
                showPreview = false
            } = options;

            // Create UI elements
            container.innerHTML = `
                <div class="omni-convert-ui">
                    <h3>${title}</h3>
                    <div class="upload-zone" style="
                        border: 2px dashed #ccc;
                        border-radius: 8px;
                        padding: 40px 20px;
                        text-align: center;
                        cursor: pointer;
                        margin: 20px 0;
                        transition: border-color 0.3s ease;
                    ">
                        <p>Drop files here or click to select</p>
                        <input type="file" style="display: none;" ${multiple ? 'multiple' : ''} 
                               accept="${acceptedTypes.join(',')}" />
                    </div>
                    ${showProgress ? '<div class="progress" style="display: none;"><div class="progress-bar"></div></div>' : ''}
                    <div class="result" style="margin-top: 20px;"></div>
                    ${showPreview ? '<div class="preview" style="margin-top: 20px;"></div>' : ''}
                </div>
            `;

            const uploadZone = container.querySelector('.upload-zone');
            const fileInput = container.querySelector('input[type="file"]');
            const progressBar = container.querySelector('.progress');
            const progressFill = container.querySelector('.progress-bar');
            const result = container.querySelector('.result');

            // Setup click to select files
            uploadZone.addEventListener('click', () => fileInput.click());

            // Setup file input change
            fileInput.addEventListener('change', (e) => {
                this.handleFiles(Array.from(e.target.files), converterType, {
                    progressBar,
                    progressFill,
                    result,
                    ...options
                });
            });

            // Setup drag and drop
            this.setupDragDrop(uploadZone, {
                acceptedTypes,
                onDrop: (files) => {
                    this.handleFiles(files, converterType, {
                        progressBar,
                        progressFill,
                        result,
                        ...options
                    });
                }
            });

            return container;
        }

        async handleFiles(files, converterType, uiElements) {
            const { progressBar, progressFill, result } = uiElements;
            
            if (files.length === 0) {
                this.showResult(result, 'No valid files selected', 'error');
                return;
            }

            try {
                // Show progress
                if (progressBar) {
                    progressBar.style.display = 'block';
                    this.options.progressCallback = (percentage) => {
                        if (progressFill) {
                            progressFill.style.width = percentage + '%';
                        }
                    };
                }

                // Convert files
                const results = await this.convertFiles(converterType, files, this.options);
                
                // Handle results
                if (Array.isArray(results)) {
                    const successful = results.filter(r => r.success).length;
                    this.showResult(result, `Converted ${successful}/${results.length} files successfully`, 'success');
                } else {
                    this.showResult(result, 'Conversion completed successfully!', 'success');
                    
                    if (this.options.autoDownload) {
                        OmniConvertCore.downloadFile(results.blob, results.filename, results.mimeType);
                    }
                }

            } catch (error) {
                this.showResult(result, `Error: ${error.message}`, 'error');
            } finally {
                if (progressBar) {
                    setTimeout(() => {
                        progressBar.style.display = 'none';
                    }, 2000);
                }
            }
        }

        showResult(element, message, type) {
            if (!element) return;
            
            element.textContent = message;
            element.className = `result ${type}`;
            element.style.display = 'block';
            
            // Add some basic styling
            const colors = {
                success: '#28a745',
                error: '#dc3545',
                info: '#17a2b8'
            };
            
            element.style.color = colors[type] || '#333';
            element.style.padding = '10px';
            element.style.borderRadius = '4px';
            element.style.backgroundColor = type === 'error' ? '#f8d7da' : '#d4edda';
        }

        // Static method to create instance with all defaults
        static create(options = {}) {
            return new OmniConvert(options);
        }

        // Get supported formats
        static getSupportedFormats() {
            return {
                image: {
                    input: ['jpg', 'jpeg', 'png', 'webp'],
                    output: ['jpg', 'jpeg', 'png', 'pdf']
                },
                data: {
                    input: ['csv', 'json'],
                    output: ['csv', 'json', 'txt']
                }
            };
        }
    }

    // ЭКСПОРТ ДЛЯ БРАУЗЕРА
    if (typeof window !== 'undefined') {
        // Главный класс
        window.OmniConvert = OmniConvert;
        
        // Базовые классы (если нужны для расширения)  
        window.OmniConvertCore = OmniConvertCore;
        window.BaseConverter = BaseConverter;
        
        // Отдельные конвертеры (если нужны для прямого использования)
        window.JpgToPngConverter = JpgToPngConverter;
        window.PngToJpgConverter = PngToJpgConverter;
        window.WebpToJpgConverter = WebpToJpgConverter;
        window.ImageResizer = ImageResizer;
        window.JpgToPdfConverter = JpgToPdfConverter;
        window.CsvToJsonConverter = CsvToJsonConverter;
        window.JsonToCsvConverter = JsonToCsvConverter;
        window.Base64Converter = Base64Converter;
        
        // Создаем глобальный экземпляр для быстрого использования
        window.omniConvert = new OmniConvert();
        
        console.log('🔄 OmniConvert library loaded successfully!');
    }

})();
