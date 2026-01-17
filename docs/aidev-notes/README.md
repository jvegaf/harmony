# AIDEV Notes Index

This directory contains all developer notes that were previously embedded as `AIDEV-NOTE` comments in the source code. These notes have been extracted and organized into topic-specific documents for better maintainability and discoverability.

---

## Why This Documentation Exists

AIDEV notes serve as inline knowledge for both AI assistants and human developers. They document:

- **Non-obvious implementation decisions**: Why something was done a certain way
- **API quirks and edge cases**: Unusual behavior from external services
- **Data structure variations**: Fields that can come in multiple formats
- **Persistence mechanisms**: How state is saved and restored
- **Known issues and workarounds**: Temporary solutions to specific problems

By consolidating these notes into dedicated documents, we:

1. ✅ Make them easier to find and reference
2. ✅ Reduce code clutter
3. ✅ Enable better searchability across the project
4. ✅ Provide richer context with examples and diagrams
5. ✅ Keep the documentation version-controlled alongside code

---

## Available Documentation

### 1. [Beatport Integration](./beatport-integration.md)

**Topics:**

- Genre field variations in API responses
- Differences between scraping and API v4 data structures
- Optional field handling
- API configuration requirements

**Key Files Covered:**

- `src/main/lib/tagger/beatport/client/client.ts`
- `src/main/lib/tagger/bp/bpTagMapper.ts`
- `src/main/lib/tagger/bp/beatport.ts`

**AIDEV Notes Extracted:** 5

---

### 2. [Track List Sorting](./tracklist-sorting.md)

**Topics:**

- Sort preference persistence mechanism
- Configuration initialization
- AG Grid integration
- Data flow diagrams

**Key Files Covered:**

- `src/renderer/src/stores/useLibraryStore.ts`
- `src/renderer/src/components/TrackList/TrackList.tsx`

**AIDEV Notes Extracted:** 3

---

## Guidelines for Maintaining AIDEV Documentation

### When to Add AIDEV Notes

Add AIDEV documentation when you encounter:

1. **Complex Logic**: Code that isn't self-explanatory and requires context
2. **External API Quirks**: Unusual behavior from third-party services
3. **Historical Decisions**: Why something was implemented a certain way
4. **Edge Cases**: Special handling for unusual scenarios
5. **Performance Optimizations**: Non-obvious code for speed/memory
6. **Workarounds**: Temporary solutions to known issues

### Documentation Process

1. **During Development:**

   - Add inline `AIDEV-NOTE:` comments in the code near the relevant logic
   - Keep notes concise - just enough to explain the "why"

2. **Periodic Consolidation:**

   - Extract related notes into topic-specific documents in `docs/aidev-notes/`
   - Keep the inline comments as short anchor references
   - Update this index

3. **On Updates:**
   - When modifying code with AIDEV notes, update the corresponding documentation
   - Add new notes for new edge cases or changes in behavior

### Documentation Format

Each document should include:

````markdown
# [Topic] - Developer Notes

## Overview

Brief description of what this document covers

---

## [Subtopic 1]

### [Specific Feature/Issue]

**Location:** `path/to/file.ts:line-number`

**Context:** When/where this applies

**Note:** `code or quote`

**Details:**

- Explanation point 1
- Explanation point 2

**Related Code:** `code example`

---

## Summary

Key takeaways

---

## Related Files

- List of relevant files

---

**Last Updated:** YYYY-MM-DD
````

---

## Statistics

- **Total AIDEV Notes Documented:** 8
- **Documents Created:** 2
- **Source Files Covered:** 5
- **Last Sync:** 2026-01-17

---

## Search Tips

### Find All AIDEV Comments Still in Code

```bash
rg "AIDEV-" --type-add 'source:*.{ts,tsx,js,jsx}' --type source -n
```

### Search Within Documentation

```bash
rg "keyword" docs/aidev-notes/
```

### Find Documentation for a Specific File

```bash
rg "src/path/to/file.ts" docs/aidev-notes/
```

---

## Maintenance Schedule

- **Weekly**: Check for new `AIDEV-NOTE` comments in recent commits
- **Monthly**: Review and update existing documentation
- **Per Release**: Verify all major changes have corresponding documentation updates

---

**Maintained By:** Development Team  
**First Created:** 2026-01-17  
**Last Updated:** 2026-01-17
