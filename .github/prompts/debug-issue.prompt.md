---
mode: 'agent'
model: Claude Sonnet 4
tools: ['codebase', 'terminal', 'debug']
description: 'Debug and troubleshoot issues in Harmony codebase'
---

# Debug Issues in Harmony

You are an expert debugger working on Harmony, an Electron-based music manager. Your goal is to efficiently identify, diagnose, and resolve bugs, performance issues, and unexpected behavior in the codebase.

## Debugging Methodology

### 1. Issue Triage
- **Classify the problem** (runtime error, build failure, performance, UI issue)
- **Assess severity** (critical, high, medium, low)
- **Identify affected components** (main, renderer, preload, database, UI)
- **Gather reproduction steps** and environment information

### 2. Information Gathering
- **Error messages** and stack traces
- **Log files** from main process and renderer
- **System information** (OS, Electron version, Node.js version)
- **User actions** leading to the issue
- **Environment state** when issue occurs

### 3. Hypothesis Formation
- **Most likely causes** based on symptoms
- **Quick tests** to validate assumptions
- **Scope narrowing** to isolate the problem
- **Root cause analysis** methodology

### 4. Systematic Investigation
- **Reproduce the issue** reliably
- **Isolate variables** one at a time
- **Test fixes** incrementally
- **Validate solutions** thoroughly

## Common Issue Categories

### Runtime Errors

#### JavaScript/TypeScript Errors
**Symptoms**: Uncaught exceptions, type errors, undefined variables
**Investigation Steps**:
1. Check browser DevTools console (Renderer) or main process logs
2. Examine stack trace for exact failure point
3. Review recent changes to failing code
4. Check for TypeScript compilation errors

**Example Debug Session**:
```typescript
// Add error boundaries to catch React errors
class ErrorBoundary extends Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error:', error, errorInfo);
    // Log to main process for persistent logging
    window.Main.logger.error('Renderer Error', { error: error.message, stack: error.stack });
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

// Wrap components with error boundaries
<ErrorBoundary>
  <TrackList tracks={tracks} />
</ErrorBoundary>
```

#### IPC Communication Failures
**Symptoms**: Timeouts, unhandled promise rejections, missing responses
**Investigation Steps**:
1. Verify IPC channel names match between main and renderer
2. Check if handlers are properly registered in main process
3. Validate message payload structure and types
4. Monitor for timing issues or race conditions

**Debug IPC Issues**:
```typescript
// Add IPC debugging wrapper in preload
const originalInvoke = ipcRenderer.invoke;
ipcRenderer.invoke = async function(channel: string, ...args: any[]) {
  console.log(`IPC -> ${channel}`, args);
  const start = performance.now();

  try {
    const result = await originalInvoke.call(this, channel, ...args);
    const duration = performance.now() - start;
    console.log(`IPC <- ${channel} (${duration.toFixed(2)}ms)`, result);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`IPC ERROR ${channel} (${duration.toFixed(2)}ms)`, error);
    throw error;
  }
};

// In main process, add request logging
ipcMain.handle('any-channel', async (event, ...args) => {
  const requestId = generateId();
  log.info(`IPC Request ${requestId}:`, { channel: 'any-channel', args });

  try {
    const result = await actualHandler(...args);
    log.info(`IPC Response ${requestId}:`, { success: true, result });
    return result;
  } catch (error) {
    log.error(`IPC Error ${requestId}:`, { error: error.message, stack: error.stack });
    throw error;
  }
});
```

### Performance Issues

#### Memory Leaks
**Symptoms**: Increasing memory usage over time, app becomes sluggish
**Investigation Steps**:
1. Use DevTools Memory tab to take heap snapshots
2. Compare snapshots before/after operations
3. Look for detached DOM nodes and growing object counts
4. Review event listener cleanup and component lifecycle

**Memory Leak Detection**:
```typescript
// Add memory monitoring
class MemoryMonitor {
  private intervalId: NodeJS.Timeout;

  start() {
    this.intervalId = setInterval(() => {
      if (process.memoryUsage) {
        const usage = process.memoryUsage();
        console.log('Memory Usage:', {
          rss: `${Math.round(usage.rss / 1024 / 1024)} MB`,
          heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)} MB`,
          heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)} MB`,
        });
      }
    }, 5000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

// Monitor component cleanup
const useMemoryLeakDetector = (componentName: string) => {
  useEffect(() => {
    console.log(`${componentName} mounted`);
    return () => {
      console.log(`${componentName} unmounted`);
      // Check for common leak sources
      const timers = (window as any)._activeTimers;
      if (timers && Object.keys(timers).length > 0) {
        console.warn(`Active timers detected after ${componentName} unmount:`, timers);
      }
    };
  }, [componentName]);
};
```

#### Slow Database Operations
**Symptoms**: Long delays for library operations, UI freezing
**Investigation Steps**:
1. Enable SQL query logging in TypeORM
2. Identify slow queries and missing indexes
3. Analyze query execution plans
4. Profile database file access patterns

**Database Performance Debugging**:
```typescript
// Enable query logging
const dataSource = new DataSource({
  type: 'sqlite',
  database: dbPath,
  entities: [TrackEntity, PlaylistEntity],
  synchronize: true,
  logging: ['query', 'error', 'schema'],
  logger: 'advanced-console',
  extra: {
    // Add query timing
    enableQueryTimestamp: true,
  },
});

// Add query performance monitoring
class QueryProfiler {
  private static queries: Array<{ sql: string; duration: number; timestamp: Date }> = [];

  static logQuery(sql: string, duration: number) {
    this.queries.push({ sql, duration, timestamp: new Date() });

    if (duration > 100) { // Log slow queries (>100ms)
      log.warn('Slow Query Detected:', {
        sql: sql.substring(0, 200),
        duration: `${duration}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  static getSlowQueries() {
    return this.queries.filter(q => q.duration > 100);
  }

  static getQueryStats() {
    const total = this.queries.length;
    const avg = this.queries.reduce((sum, q) => sum + q.duration, 0) / total;
    const max = Math.max(...this.queries.map(q => q.duration));

    return { total, average: avg, maximum: max };
  }
}

// Wrap repository methods with profiling
const originalFind = trackRepository.find;
trackRepository.find = async function(...args) {
  const start = performance.now();
  const result = await originalFind.apply(this, args);
  const duration = performance.now() - start;
  QueryProfiler.logQuery('TrackRepository.find', duration);
  return result;
};
```

### UI/UX Issues

#### Component Not Updating
**Symptoms**: UI doesn't reflect data changes, stale component state
**Investigation Steps**:
1. Check if component dependencies are correct
2. Verify state management store updates
3. Confirm React key props for list items
4. Test component re-rendering conditions

**React State Debugging**:
```typescript
// Debug hook for tracking renders
const useRenderLogger = (componentName: string, props?: any) => {
  const renderCount = useRef(0);
  const prevProps = useRef(props);

  useEffect(() => {
    renderCount.current += 1;
    console.log(`${componentName} render #${renderCount.current}`, {
      props,
      propsChanged: JSON.stringify(props) !== JSON.stringify(prevProps.current),
    });
    prevProps.current = props;
  });
};

// State change tracking in Zustand stores
const createTrackedStore = <T>(storeCreator: StateCreator<T>) => {
  return create<T>()(
    subscribeWithSelector(
      devtools(
        (set, get, api) => storeCreator(
          (newState) => {
            console.log('Store Update:', {
              previous: get(),
              new: newState,
              timestamp: new Date().toISOString(),
            });
            set(newState);
          },
          get,
          api
        ),
        { name: 'harmony-store' }
      )
    )
  );
};

// Component prop change tracking
const ComponentDebugger = ({ children, name, ...props }) => {
  const [previousProps, setPreviousProps] = useState(props);

  useEffect(() => {
    const changes = Object.keys(props).filter(
      key => props[key] !== previousProps[key]
    );

    if (changes.length > 0) {
      console.log(`${name} props changed:`, {
        changed: changes,
        previous: pick(previousProps, changes),
        current: pick(props, changes),
      });
    }

    setPreviousProps(props);
  }, [props, previousProps, name]);

  return children;
};
```

#### Layout and Styling Issues
**Symptoms**: Misaligned elements, overflow, responsive issues
**Investigation Steps**:
1. Use DevTools Elements panel to inspect computed styles
2. Check CSS specificity conflicts
3. Verify Mantine theme customizations
4. Test on different screen sizes and zoom levels

**CSS Debugging Utilities**:
```css
/* Add visual debugging borders */
.debug-layout * {
  outline: 1px solid red !important;
  outline-offset: -1px;
}

.debug-layout *:hover {
  outline: 2px solid blue !important;
  outline-offset: -2px;
}

/* CSS Grid debugging */
.debug-grid {
  background-image:
    linear-gradient(rgba(255,0,0,0.1) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,0,0,0.1) 1px, transparent 1px);
  background-size: 20px 20px;
}

/* Flexbox debugging */
.debug-flex > * {
  outline: 1px solid orange;
  position: relative;
}

.debug-flex > *:before {
  content: attr(class);
  position: absolute;
  top: 0;
  left: 0;
  background: orange;
  color: white;
  font-size: 10px;
  padding: 2px;
  z-index: 1000;
}
```

### Audio and Media Issues

#### Audio Playback Failures
**Symptoms**: Tracks won't play, audio cuts out, format errors
**Investigation Steps**:
1. Check supported audio formats and codecs
2. Verify file integrity and accessibility
3. Test with different audio files
4. Monitor audio context state

**Audio Debugging**:
```typescript
class AudioDebugger {
  static async analyzeFile(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      const buffer = await fs.readFile(filePath);

      // Basic file validation
      const analysis = {
        exists: true,
        size: stats.size,
        readable: true,
        format: this.detectFormat(buffer),
        corruption: this.checkCorruption(buffer),
      };

      console.log('Audio File Analysis:', analysis);
      return analysis;
    } catch (error) {
      console.error('Audio Analysis Failed:', error);
      return { exists: false, error: error.message };
    }
  }

  static detectFormat(buffer: Buffer): string {
    const header = buffer.slice(0, 12);

    if (header.slice(0, 3).toString() === 'ID3' ||
        (header[0] === 0xFF && (header[1] & 0xE0) === 0xE0)) {
      return 'MP3';
    } else if (header.slice(0, 4).toString() === 'fLaC') {
      return 'FLAC';
    } else if (header.slice(0, 4).toString() === 'RIFF' &&
               header.slice(8, 12).toString() === 'WAVE') {
      return 'WAV';
    } else if (header.slice(4, 8).toString() === 'ftyp') {
      return 'M4A/MP4';
    }

    return 'Unknown';
  }

  static checkCorruption(buffer: Buffer): boolean {
    // Basic corruption checks
    return buffer.length > 0 && buffer.some(byte => byte !== 0);
  }
}

// Audio context monitoring
class AudioContextMonitor {
  static monitor(audioContext: AudioContext) {
    const originalMethod = audioContext.createBufferSource;

    audioContext.createBufferSource = function() {
      const source = originalMethod.call(this);
      console.log('Audio Source Created:', {
        state: audioContext.state,
        sampleRate: audioContext.sampleRate,
        currentTime: audioContext.currentTime,
      });
      return source;
    };

    audioContext.addEventListener('statechange', () => {
      console.log('Audio Context State Changed:', audioContext.state);
    });
  }
}
```

## Debugging Tools and Techniques

### DevTools Integration
```typescript
// Enhanced console logging for development
const createLogger = (context: string) => ({
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🐛 [${context}] ${message}`, data);
    }
  },
  info: (message: string, data?: any) => {
    console.log(`ℹ️ [${context}] ${message}`, data);
  },
  warn: (message: string, data?: any) => {
    console.warn(`⚠️ [${context}] ${message}`, data);
  },
  error: (message: string, error?: Error | any) => {
    console.error(`❌ [${context}] ${message}`, error);
    // Send to main process for logging
    if (window.Main?.logger) {
      window.Main.logger.error(`[${context}] ${message}`, error);
    }
  },
});

// Use in components
const logger = createLogger('TrackList');
logger.debug('Component rendered', { trackCount: tracks.length });
```

### Performance Profiling
```typescript
// Performance measurement wrapper
const measurePerformance = <T extends any[], R>(
  fn: (...args: T) => R,
  name: string
): ((...args: T) => R) => {
  return (...args: T): R => {
    const start = performance.now();
    const result = fn(...args);
    const duration = performance.now() - start;

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);

    if (duration > 100) {
      console.warn(`🐌 Slow operation detected: ${name} (${duration.toFixed(2)}ms)`);
    }

    return result;
  };
};

// Async version
const measureAsyncPerformance = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  name: string
): ((...args: T) => Promise<R>) => {
  return async (...args: T): Promise<R> => {
    const start = performance.now();
    const result = await fn(...args);
    const duration = performance.now() - start;

    console.log(`⏱️ ${name}: ${duration.toFixed(2)}ms`);
    return result;
  };
};

// Usage examples
const optimizedFunction = measurePerformance(heavyComputation, 'Heavy Computation');
const optimizedAsyncFunction = measureAsyncPerformance(databaseQuery, 'Database Query');
```

### Network and IPC Monitoring
```typescript
// IPC traffic monitor
class IPCTrafficMonitor {
  private static requests = new Map<string, number>();
  private static responses = new Map<string, number>();

  static trackRequest(channel: string) {
    const count = this.requests.get(channel) || 0;
    this.requests.set(channel, count + 1);
  }

  static trackResponse(channel: string) {
    const count = this.responses.get(channel) || 0;
    this.responses.set(channel, count + 1);
  }

  static getStats() {
    return {
      requests: Object.fromEntries(this.requests),
      responses: Object.fromEntries(this.responses),
      pendingRequests: [...this.requests.entries()].map(([channel, req]) => ({
        channel,
        pending: req - (this.responses.get(channel) || 0),
      })).filter(item => item.pending > 0),
    };
  }

  static printStats() {
    console.table(this.getStats());
  }
}
```

## Debugging Workflow

### 1. Initial Assessment
```bash
# Check system information
node --version
yarn --version
npx electron --version

# Check for build issues
yarn typecheck
yarn lint

# Review recent logs
tail -f ~/.config/harmony/logs/main.log
```

### 2. Reproduce the Issue
- Create minimal test case
- Document exact steps to reproduce
- Note environment conditions (OS, system load, etc.)
- Capture screenshots or recordings if relevant

### 3. Gather Debug Information
- Enable debug mode: `DEBUG=harmony:* yarn dev`
- Capture console output from both main and renderer processes
- Export relevant database tables for data-related issues
- Monitor system resources (CPU, memory, disk I/O)

### 4. Analyze and Fix
- Form hypothesis based on gathered information
- Implement targeted debugging code
- Test fixes incrementally
- Verify fix doesn't introduce regressions

### 5. Validate Solution
- Test fix in development environment
- Run automated tests (when available)
- Test on different operating systems if applicable
- Document the solution for future reference

## Escalation Criteria

When to escalate or seek additional help:
- Security vulnerabilities discovered
- Data corruption or loss potential
- Performance degradation >50% from baseline
- Electron or Node.js version compatibility issues
- Issues affecting >25% of expected use cases

Ask for clarification on any specific issue you're debugging, and I'll provide targeted debugging strategies and code examples to help resolve the problem efficiently.
