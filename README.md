# TabZippr

A Chrome extension for backing up and restoring browser windows with all their tabs.

## Version: 1.1.1

### Changelog
- 1.1.1: Fixed JSZip loading in service worker
- 1.1.0: Added duplicate tab detection and cleanup
- 1.0.0: Initial release

## Core Features
- Backup current window's tabs to a zip file
- Restore tabs from backup
- Automatic backup directory management
- Status updates and error handling
- Tab count display
- Duplicate tab detection and cleanup

## Project Structure
```
TabZippr/
├── js/
│   ├── background.js     # Core background service
│   ├── popup.js         # Core popup interface
│   ├── version.js       # Version and configuration
│   └── jszip.min.js     # Compression library
├── images/              # Extension icons
├── manifest.json        # Extension manifest
└── popup.html          # Extension popup interface
```

## Development Guidelines

### Core Functionality Protection
The core functionality of TabZippr is protected and should not be modified without thorough testing. Core files are marked with:
```javascript
// CORE FUNCTIONALITY START - DO NOT MODIFY WITHOUT TESTING //
...
// CORE FUNCTIONALITY END - DO NOT MODIFY WITHOUT TESTING //
```

### Adding New Features
1. New features should be added below the core functionality sections
2. Use the version.js file to access core configuration
3. Do not modify existing core functions
4. Add new functions for new features
5. Test thoroughly before merging changes

### Version Control
- Major version: Breaking changes to core functionality
- Minor version: New features
- Patch version: Bug fixes and non-core changes

### Testing Requirements
Before modifying core functionality:
1. Test backup creation
2. Test backup restoration
3. Verify compression works
4. Check error handling
5. Verify UI responsiveness

## Core Configuration
Core settings are defined in version.js and include:
- Backup file format
- Compression settings
- File naming conventions

## License
All rights reserved. Core functionality is protected.