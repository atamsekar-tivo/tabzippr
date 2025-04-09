// TabZippr Version Information
const VERSION = {
    major: 1,
    minor: 1,
    patch: 1,  // Incremented for JSZip loading fix
    buildDate: '2025-04-08',
    core: {
        backupFormat: 'MM-DD-YYYY-HH-MM-SS',
        compressionLevel: 9,
        filePrefix: 'TabZippr-backup'
    }
};

// Core functionality configuration - DO NOT MODIFY without testing
const CORE_CONFIG = {
    compression: {
        type: 'DEFLATE',
        level: VERSION.core.compressionLevel
    },
    backup: {
        format: VERSION.core.backupFormat,
        prefix: VERSION.core.filePrefix
    }
};

export { VERSION, CORE_CONFIG };