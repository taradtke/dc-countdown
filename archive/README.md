# Archive - DC Migration System v1.0

This directory contains the original v1.0 codebase that has been replaced by the refactored v2.0 architecture.

## ⚠️ Important Notice

**These files are archived and no longer in use.** They are kept for reference only and will be removed in a future cleanup.

## 📁 Archive Structure

```
archive/
└── v1/
    ├── server.js              # Original monolithic Express server (866 lines)
    ├── database.js            # Original database class (1,611 lines)
    ├── migrate.js             # Original migration runner
    ├── public/                # Original frontend files
    │   ├── index.html         # Original countdown dashboard
    │   ├── tracking.html      # Original tracking interface
    │   ├── countdown.js       # Original countdown logic (462 lines)
    │   ├── tracking.js        # Original tracking logic (2,405 lines)
    │   ├── engineers.js       # Engineer list configuration
    │   └── test-upload.html   # Test file upload interface
    ├── scripts/               # Migration and utility scripts
    │   ├── add-*.js          # Database alteration scripts
    │   ├── create-*.js       # Table creation scripts
    │   ├── cleanup-*.js      # Data cleanup scripts
    │   └── test-*.js         # Test scripts
    ├── migrations/           # SQL migration files
    │   └── *.sql            # Database schema migrations
    └── sample-data/          # Sample CSV data files
        └── *.csv            # Various CSV import samples
```

## 🔄 Migration to v2.0

The v2.0 refactoring includes:

### Architecture Changes
- **Modular Structure**: Code split into models, services, routes, and middleware
- **Base Model Pattern**: Eliminated 1000+ lines of duplicated CRUD code
- **Service Layer**: Business logic separated from routes
- **Configuration Management**: Centralized environment configuration

### New Features in v2.0
- JWT-based authentication system
- Postmark email integration
- Automated daily reports and reminders
- Role-based access control
- Improved error handling
- Production-ready Docker setup
- Database migration system

### File Mappings

| v1.0 File | v2.0 Equivalent |
|-----------|-----------------|
| `server.js` | `src/app.js` + `src/routes/*.js` |
| `database.js` | `src/database/Database.js` + `src/models/*.js` |
| `migrate.js` | `src/database/migrate.js` |
| `countdown.js` | `public/js/countdown.js` |
| `tracking.js` | `public/js/tracking.js` |
| `index.html` | `public/index.html` |
| `tracking.html` | `public/tracking.html` |

## 📊 Code Reduction

The refactoring achieved significant code reduction:

- **Database Operations**: ~1,600 lines → ~300 lines (81% reduction)
- **Server/Routes**: ~900 lines → ~200 lines per route file
- **Frontend**: ~2,900 lines → Modularized components
- **Overall**: ~5,400 lines → ~3,000 lines (44% reduction)

## 🗑️ Cleanup Timeline

These archived files are scheduled for removal:
- **Phase 1** (Current): Files moved to archive
- **Phase 2** (After testing): Verify v2.0 stability
- **Phase 3** (1 month): Final removal of archive

## 📝 Notes

### Why Keep the Archive?

1. **Reference**: Understanding original implementation
2. **Rollback**: Emergency fallback if needed
3. **Migration**: Ensuring no logic was missed
4. **Documentation**: Historical record of evolution

### Data Migration

Sample data files have been preserved in `sample-data/` for reference:
- Server configurations
- VLAN mappings
- Network definitions
- Voice system specs
- Customer data

### Using Archived Code

⚠️ **DO NOT** import or reference these files in the new codebase.

If you need to reference old logic:
1. Review the archived file
2. Implement using new patterns
3. Follow v2.0 architecture guidelines

## 🔗 Related Documentation

- [Migration Guide](../MIGRATION.md)
- [v2.0 Architecture](../README.md)
- [Development Guide](../DEVELOPMENT.md)

---

**Archive Date**: November 2024  
**Archived By**: System Refactoring  
**Version**: 1.0.0 → 2.0.0