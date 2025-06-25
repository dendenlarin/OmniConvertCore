/**
 * OmniConvert - Complete library for file conversion in browser
 * @version 1.0.0
 * @license MIT
 * 
 * Usage:
 * <script src="omni-convert.js"></script>
 * <script>
 *   const converter = new OmniConvert();
 *   converter.jpgToPng(files);
 * </script>
 */

(function() {
    'use strict';

    /**
     * Base OmniConvert Core class
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
            if (!file || !file.name || !allowedTypes) {
                return false;
            }
            
            return allowedTypes.some(type => {
                if (!type) return false;
                
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
     * Base class for all converters
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
     * IMAGE CONVERTERS
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


    // PNG to WebP Converter
    class PngToWebpConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/png', '.png'];
            this.outputType = 'image/webp';
            this.quality = options.quality || 0.8;
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from PNG to WebP`);

            const img = await this.loadImage(file);
            const canvas = this.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(img.src);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.outputType, this.quality);
            });

            if (!blob) {
                throw new Error('Failed to convert PNG to WebP. Browser may not support WebP format.');
            }

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'webp'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                quality: this.quality
            };
        }
    }

    // JPG to WebP Converter
    class JpgToWebpConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/jpeg', 'image/jpg', '.jpg', '.jpeg'];
            this.outputType = 'image/webp';
            this.quality = options.quality || 0.8;
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from JPG to WebP`);

            const img = await this.loadImage(file);
            const canvas = this.createCanvas(img.width, img.height);
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(img.src);

            const blob = await new Promise(resolve => {
                canvas.toBlob(resolve, this.outputType, this.quality);
            });

            if (!blob) {
                throw new Error('Failed to convert JPG to WebP. Browser may not support WebP format.');
            }

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'webp'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                quality: this.quality
            };
        }
    }

    // HEIC to JPG Converter (requires heic2any library)
    class HeicToJpgConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/heic', 'image/heif', '.heic', '.heif'];
            this.outputType = 'image/jpeg';
            this.quality = options.quality || 0.9;
            
            if (typeof heic2any === 'undefined' && typeof window !== 'undefined') {
                console.warn('heic2any library not found. Please include heic2any library for HEIC to JPG conversion.');
            }
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from HEIC to JPG`);

            if (typeof heic2any === 'undefined') {
                throw new Error('heic2any library is required for HEIC to JPG conversion. Please include it in your page.');
            }

            try {
                const convertedBlob = await heic2any({
                    blob: file,
                    toType: 'image/jpeg',
                    quality: this.quality
                });

                const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;

                return {
                    blob,
                    filename: OmniConvertCore.generateFilename(file.name, 'jpg'),
                    mimeType: this.outputType,
                    originalSize: file.size,
                    newSize: blob.size,
                    quality: this.quality
                };
            } catch (error) {
                throw new Error(`Failed to convert HEIC to JPG: ${error.message}`);
            }
        }
    }

    // SVG to PNG Converter
    class SvgToPngConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['image/svg+xml', '.svg'];
            this.outputType = 'image/png';
            this.width = options.width || null;
            this.height = options.height || null;
            this.scale = options.scale || 1;
            this.backgroundColor = options.backgroundColor || 'transparent';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from SVG to PNG`);

            const svgText = await file.text();
            const blob = await this.svgToPng(svgText);

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'png'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                scale: this.scale
            };
        }

        async svgToPng(svgText) {
            return new Promise((resolve, reject) => {
                const img = new Image();
                
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions
                    canvas.width = this.width || img.width * this.scale;
                    canvas.height = this.height || img.height * this.scale;

                    // Set background color if not transparent
                    if (this.backgroundColor !== 'transparent') {
                        ctx.fillStyle = this.backgroundColor;
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                    }

                    // Draw SVG
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Failed to convert SVG to PNG'));
                        }
                    }, this.outputType);
                };

                img.onerror = () => reject(new Error('Failed to load SVG'));

                // Create data URL from SVG
                const svgBlob = new Blob([svgText], { type: 'image/svg+xml' });
                img.src = URL.createObjectURL(svgBlob);
            });
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
     * DATA CONVERTERS
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

    // XML to JSON Converter
    class XmlToJsonConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['text/xml', 'application/xml', '.xml'];
            this.outputType = 'application/json';
            this.attributePrefix = options.attributePrefix || '@';
            this.textNodeName = options.textNodeName || '#text';
            this.ignoreAttributes = options.ignoreAttributes || false;
            this.parseNumbers = options.parseNumbers !== false;
            this.parseBooleans = options.parseBooleans !== false;
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from XML to JSON`);

            const xmlText = await file.text();
            
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
                
                // Check for parsing errors
                const parseError = xmlDoc.getElementsByTagName('parsererror');
                if (parseError.length > 0) {
                    throw new Error('Invalid XML: ' + parseError[0].textContent);
                }

                const jsonData = this.xmlToJson(xmlDoc.documentElement);
                const jsonString = JSON.stringify(jsonData, null, 2);
                const blob = new Blob([jsonString], { type: this.outputType });

                return {
                    blob,
                    filename: OmniConvertCore.generateFilename(file.name, 'json'),
                    mimeType: this.outputType,
                    originalSize: file.size,
                    newSize: blob.size,
                    rootElement: xmlDoc.documentElement.nodeName
                };
            } catch (error) {
                throw new Error(`XML parsing failed: ${error.message}`);
            }
        }

        xmlToJson(xmlNode) {
            let result = {};

            // Handle attributes
            if (xmlNode.attributes && xmlNode.attributes.length > 0 && !this.ignoreAttributes) {
                for (let i = 0; i < xmlNode.attributes.length; i++) {
                    const attribute = xmlNode.attributes[i];
                    result[this.attributePrefix + attribute.nodeName] = this.parseValue(attribute.nodeValue);
                }
            }

            // Handle child nodes
            if (xmlNode.hasChildNodes()) {
                for (let i = 0; i < xmlNode.childNodes.length; i++) {
                    const childNode = xmlNode.childNodes[i];

                    if (childNode.nodeType === Node.TEXT_NODE) {
                        const textContent = childNode.nodeValue.trim();
                        if (textContent) {
                            if (Object.keys(result).length === 0) {
                                // If no attributes or other elements, return the text directly
                                return this.parseValue(textContent);
                            } else {
                                // Add text content with special key
                                result[this.textNodeName] = this.parseValue(textContent);
                            }
                        }
                    } else if (childNode.nodeType === Node.ELEMENT_NODE) {
                        const childName = childNode.nodeName;
                        const childValue = this.xmlToJson(childNode);

                        if (result[childName]) {
                            // Multiple elements with same name - convert to array
                            if (!Array.isArray(result[childName])) {
                                result[childName] = [result[childName]];
                            }
                            result[childName].push(childValue);
                        } else {
                            result[childName] = childValue;
                        }
                    }
                }
            }

            return Object.keys(result).length === 0 ? null : result;
        }

        parseValue(value) {
            if (!this.parseNumbers && !this.parseBooleans) {
                return value;
            }

            // Parse booleans
            if (this.parseBooleans) {
                if (value.toLowerCase() === 'true') return true;
                if (value.toLowerCase() === 'false') return false;
            }

            // Parse numbers
            if (this.parseNumbers) {
                if (!isNaN(value) && !isNaN(parseFloat(value))) {
                    return parseFloat(value);
                }
            }

            return value;
        }
    }

    // Markdown to HTML Converter
    class MarkdownToHtmlConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['text/markdown', 'text/x-markdown', '.md', '.markdown'];
            this.outputType = 'text/html';
            this.enableTables = options.enableTables !== false;
            this.enableCodeBlocks = options.enableCodeBlocks !== false;
            this.enableStrikethrough = options.enableStrikethrough !== false;
            this.enableTaskLists = options.enableTaskLists !== false;
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from Markdown to HTML`);

            const markdownText = await file.text();
            const htmlContent = this.markdownToHtml(markdownText);
            
            const blob = new Blob([htmlContent], { type: this.outputType });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'html'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                features: {
                    tables: this.enableTables,
                    codeBlocks: this.enableCodeBlocks,
                    strikethrough: this.enableStrikethrough,
                    taskLists: this.enableTaskLists
                }
            };
        }

        markdownToHtml(markdown) {
            let html = markdown;

            // Headers
            html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
            html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
            html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

            // Bold
            html = html.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
            html = html.replace(/__(.*?)__/gim, '<strong>$1</strong>');

            // Italic
            html = html.replace(/\*(.*?)\*/gim, '<em>$1</em>');
            html = html.replace(/_(.*?)_/gim, '<em>$1</em>');

            // Strikethrough
            if (this.enableStrikethrough) {
                html = html.replace(/~~(.*?)~~/gim, '<del>$1</del>');
            }

            // Code blocks
            if (this.enableCodeBlocks) {
                html = html.replace(/```([^`]*?)```/gims, '<pre><code>$1</code></pre>');
                html = html.replace(/`([^`]*?)`/gim, '<code>$1</code>');
            }

            // Links
            html = html.replace(/\[([^\]]*?)\]\(([^\)]*?)\)/gim, '<a href="$2">$1</a>');

            // Images
            html = html.replace(/!\[([^\]]*?)\]\(([^\)]*?)\)/gim, '<img alt="$1" src="$2" />');

            // Lists
            html = html.replace(/^\* (.*$)/gim, '<li>$1</li>');
            html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
            
            // Wrap consecutive list items
            html = html.replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>');
            html = html.replace(/(<li>.*<\/li>)/s, '<ol>$1</ol>');

            // Task lists
            if (this.enableTaskLists) {
                html = html.replace(/^\- \[ \] (.*$)/gim, '<li><input type="checkbox" disabled> $1</li>');
                html = html.replace(/^\- \[x\] (.*$)/gim, '<li><input type="checkbox" checked disabled> $1</li>');
            }

            // Horizontal rules
            html = html.replace(/^---$/gim, '<hr>');

            // Blockquotes
            html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');

            // Tables (basic support)
            if (this.enableTables) {
                html = this.convertTables(html);
            }

            // Line breaks
            html = html.replace(/\n\n/gim, '</p><p>');
            html = html.replace(/\n/gim, '<br>');

            // Wrap in paragraphs
            html = '<p>' + html + '</p>';

            // Clean up empty paragraphs
            html = html.replace(/<p><\/p>/gim, '');

            return html;
        }

        convertTables(html) {
            const lines = html.split('\n');
            let inTable = false;
            let tableHtml = '';
            let result = [];

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.includes('|') && !inTable) {
                    // Start of table
                    inTable = true;
                    tableHtml = '<table><thead><tr>';
                    const headers = line.split('|').map(h => h.trim()).filter(h => h);
                    headers.forEach(header => {
                        tableHtml += `<th>${header}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                } else if (line.includes('|') && inTable && !line.includes('---')) {
                    // Table row
                    tableHtml += '<tr>';
                    const cells = line.split('|').map(c => c.trim()).filter(c => c);
                    cells.forEach(cell => {
                        tableHtml += `<td>${cell}</td>`;
                    });
                    tableHtml += '</tr>';
                } else if (inTable && !line.includes('|')) {
                    // End of table
                    tableHtml += '</tbody></table>';
                    result.push(tableHtml);
                    inTable = false;
                    result.push(line);
                } else if (!inTable) {
                    result.push(line);
                }
            }

            if (inTable) {
                tableHtml += '</tbody></table>';
                result.push(tableHtml);
            }

            return result.join('\n');
        }
    }

    // JSON to XML Converter
    class JsonToXmlConverter extends BaseConverter {
        constructor(options = {}) {
            super(options);
            this.supportedInputs = ['application/json', '.json'];
            this.outputType = 'text/xml';
            this.rootElementName = options.rootElementName || 'root';
            this.attributePrefix = options.attributePrefix || '@';
            this.textNodeName = options.textNodeName || '#text';
            this.arrayElementName = options.arrayElementName || 'item';
            this.prettyPrint = options.prettyPrint !== false;
            this.xmlDeclaration = options.xmlDeclaration !== false;
            this.encoding = options.encoding || 'UTF-8';
        }

        async convert(file) {
            this.validateFile(file, this.supportedInputs);
            this.log(`Converting ${file.name} from JSON to XML`);

            const text = await file.text();
            let jsonData;

            try {
                jsonData = JSON.parse(text);
            } catch (error) {
                throw new Error(`Invalid JSON file: ${error.message}`);
            }

            const xmlContent = this.jsonToXml(jsonData);
            const blob = new Blob([xmlContent], { type: this.outputType });

            return {
                blob,
                filename: OmniConvertCore.generateFilename(file.name, 'xml'),
                mimeType: this.outputType,
                originalSize: file.size,
                newSize: blob.size,
                rootElement: this.rootElementName,
                prettyPrint: this.prettyPrint
            };
        }

        jsonToXml(jsonData) {
            let xml = '';
            
            // Add XML declaration
            if (this.xmlDeclaration) {
                xml += `<?xml version="1.0" encoding="${this.encoding}"?>\n`;
            }

            // Convert JSON to XML
            if (typeof jsonData === 'object' && jsonData !== null) {
                if (Array.isArray(jsonData)) {
                    // Root is an array
                    xml += this.arrayToXml(jsonData, this.rootElementName, 0);
                } else {
                    // Root is an object - smart root element detection
                    const keys = Object.keys(jsonData);
                    let rootElementToUse = this.rootElementName;
                    
                    if (keys.length === 1) {
                        // Single key at root level - use it as root element
                        const singleKey = keys[0];
                        xml += this.objectToXml(jsonData[singleKey], singleKey, 0);
                        return xml;
                    } else if (keys.length > 1) {
                        // Multiple keys - check if root element name was explicitly set
                        if (this.rootElementName === 'root') {
                            // Use default wrapper for multiple root keys
                            rootElementToUse = 'data';
                        }
                    } else {
                        // Empty object
                        rootElementToUse = 'empty';
                    }
                    
                    xml += this.objectToXml(jsonData, rootElementToUse, 0);
                }
            } else {
                // Root is a primitive value
                const rootForPrimitive = this.rootElementName === 'root' ? 'value' : this.rootElementName;
                xml += this.primitiveToXml(jsonData, rootForPrimitive, 0);
            }

            return xml;
        }

        objectToXml(obj, elementName, indent = 0) {
            const indentStr = this.prettyPrint ? '  '.repeat(indent) : '';
            const newlineStr = this.prettyPrint ? '\n' : '';
            
            let xml = `${indentStr}<${this.sanitizeElementName(elementName)}`;
            let attributes = '';
            let content = '';
            let hasTextContent = false;

            // Process object properties
            for (const [key, value] of Object.entries(obj)) {
                if (key.startsWith(this.attributePrefix)) {
                    // This is an attribute
                    const attrName = key.substring(this.attributePrefix.length);
                    attributes += ` ${this.sanitizeAttributeName(attrName)}="${this.escapeXml(String(value))}"`;
                } else if (key === this.textNodeName) {
                    // This is text content
                    hasTextContent = true;
                    content = this.escapeXml(String(value));
                } else {
                    // This is a child element
                    if (Array.isArray(value)) {
                        content += this.arrayToXml(value, key, indent + 1);
                    } else if (typeof value === 'object' && value !== null) {
                        content += this.objectToXml(value, key, indent + 1);
                    } else {
                        content += this.primitiveToXml(value, key, indent + 1);
                    }
                }
            }

            xml += attributes;

            if (content === '' && !hasTextContent) {
                // Self-closing tag
                xml += `/>${newlineStr}`;
            } else {
                xml += '>';
                
                if (hasTextContent) {
                    // Text content only
                    xml += content;
                } else {
                    // Child elements
                    xml += newlineStr + content + indentStr;
                }
                
                xml += `</${this.sanitizeElementName(elementName)}>${newlineStr}`;
            }

            return xml;
        }

        arrayToXml(arr, elementName, indent = 0) {
            let xml = '';
            
            for (const item of arr) {
                if (Array.isArray(item)) {
                    xml += this.arrayToXml(item, this.arrayElementName, indent);
                } else if (typeof item === 'object' && item !== null) {
                    xml += this.objectToXml(item, elementName, indent);
                } else {
                    xml += this.primitiveToXml(item, elementName, indent);
                }
            }

            return xml;
        }

        primitiveToXml(value, elementName, indent = 0) {
            const indentStr = this.prettyPrint ? '  '.repeat(indent) : '';
            const newlineStr = this.prettyPrint ? '\n' : '';
            
            if (value === null || value === undefined) {
                return `${indentStr}<${this.sanitizeElementName(elementName)}/>${newlineStr}`;
            }

            const escapedValue = this.escapeXml(String(value));
            return `${indentStr}<${this.sanitizeElementName(elementName)}>${escapedValue}</${this.sanitizeElementName(elementName)}>${newlineStr}`;
        }

        sanitizeElementName(name) {
            // Ensure valid XML element name
            return name.replace(/[^a-zA-Z0-9\-_\.]/g, '_').replace(/^[^a-zA-Z_]/, '_');
        }

        sanitizeAttributeName(name) {
            // Ensure valid XML attribute name
            return name.replace(/[^a-zA-Z0-9\-_\.]/g, '_').replace(/^[^a-zA-Z_]/, '_');
        }

        escapeXml(text) {
            return text
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
        }

        // Static helper method for quick conversion
        static convertJsonString(jsonString, options = {}) {
            const converter = new JsonToXmlConverter(options);
            const jsonData = JSON.parse(jsonString);
            return converter.jsonToXml(jsonData);
        }
    }

    /**
     * MAIN OMNICONVERT CLASS
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
            this.registerConverter('png-to-webp', PngToWebpConverter);
            this.registerConverter('jpg-to-webp', JpgToWebpConverter);
            this.registerConverter('heic-to-jpg', HeicToJpgConverter);
            this.registerConverter('svg-to-png', SvgToPngConverter);
            this.registerConverter('jpg-to-pdf', JpgToPdfConverter);
            
            // Data converters
            this.registerConverter('csv-to-json', CsvToJsonConverter);
            this.registerConverter('json-to-csv', JsonToCsvConverter);
            this.registerConverter('xml-to-json', XmlToJsonConverter);
            this.registerConverter('json-to-xml', JsonToXmlConverter);
            this.registerConverter('markdown-to-html', MarkdownToHtmlConverter);
        }

        // Convenient methods for popular conversions
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


        async csvToJson(file, options = {}) {
            const converter = this.createConverter('csv-to-json', options);
            return converter.convert(file);
        }

        async jsonToCsv(file, options = {}) {
            const converter = this.createConverter('json-to-csv', options);
            return converter.convert(file);
        }


        async pngToWebp(files, options = {}) {
            return this.convertFiles('png-to-webp', files, options);
        }

        async jpgToWebp(files, options = {}) {
            return this.convertFiles('jpg-to-webp', files, options);
        }

        async heicToJpg(files, options = {}) {
            return this.convertFiles('heic-to-jpg', files, options);
        }

        async svgToPng(files, options = {}) {
            return this.convertFiles('svg-to-png', files, options);
        }

        async gifToMp4(files, options = {}) {
            return this.convertFiles('gif-to-mp4', files, options);
        }

        async xmlToJson(file, options = {}) {
            const converter = this.createConverter('xml-to-json', options);
            return converter.convert(file);
        }

        async markdownToHtml(file, options = {}) {
            const converter = this.createConverter('markdown-to-html', options);
            return converter.convert(file);
        }

        async mp4ToGif(files, options = {}) {
            return this.convertFiles('mp4-to-gif', files, options);
        }

        async jsonToXml(file, options = {}) {
            const converter = this.createConverter('json-to-xml', options);
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
                    input: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'svg', 'gif'],
                    output: ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'mp4']
                },
                data: {
                    input: ['csv', 'json', 'xml', 'md', 'markdown'],
                    output: ['csv', 'json', 'html']
                }
            };
        }
    }

    // BROWSER EXPORT
    if (typeof window !== 'undefined') {
        // Main class
        window.OmniConvert = OmniConvert;
        
        // Base classes (if needed for extension)  
        window.OmniConvertCore = OmniConvertCore;
        window.BaseConverter = BaseConverter;
        
        // Individual converters (if needed for direct usage)
        window.JpgToPngConverter = JpgToPngConverter;
        window.PngToJpgConverter = PngToJpgConverter;
        window.WebpToJpgConverter = WebpToJpgConverter;
        window.PngToWebpConverter = PngToWebpConverter;
        window.JpgToWebpConverter = JpgToWebpConverter;
        window.HeicToJpgConverter = HeicToJpgConverter;
        window.SvgToPngConverter = SvgToPngConverter;
        window.JpgToPdfConverter = JpgToPdfConverter;
        window.CsvToJsonConverter = CsvToJsonConverter;
        window.JsonToCsvConverter = JsonToCsvConverter;
        window.XmlToJsonConverter = XmlToJsonConverter;
        window.JsonToXmlConverter = JsonToXmlConverter;
        window.MarkdownToHtmlConverter = MarkdownToHtmlConverter;
        
        // Create global instance for quick usage
        window.omniConvert = new OmniConvert();
        
        console.log('🔄 OmniConvert library loaded successfully!');
    }

})();
