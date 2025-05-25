export enum LogLevel {
    ERROR = 0,
    WARN = 1,
    INFO = 2,
    DEBUG = 3
  }
  
  interface LogEntry {
    timestamp: string;
    level: string;
    message: string;
    data?: any;
    context?: string | undefined;
  }
  
  export class Logger {
    private level: LogLevel;
    private context?: string | undefined;
    private logHistory: LogEntry[] = [];
    private maxHistorySize: number = 1000;
  
    constructor(
      level: LogLevel = LogLevel.INFO,
      context?: string | undefined,
      maxHistorySize: number = 1000
    ) {
      this.level = level;
      this.context = context;
      this.maxHistorySize = maxHistorySize;
    }
  
    /**
     * Create a child logger with additional context
     */
    child(context: string): Logger {
      const childContext = this.context ? `${this.context}:${context}` : context;
      return new Logger(this.level, childContext, this.maxHistorySize);
    }
  
    /**
     * Set the logging level
     */
    setLevel(level: LogLevel): void {
      this.level = level;
    }
  
    /**
     * Get the current logging level
     */
    getLevel(): LogLevel {
      return this.level;
    }
  
    /**
     * Log an error message
     */
    error(message: string, data?: any): void {
      if (this.level >= LogLevel.ERROR) {
        this.log(LogLevel.ERROR, message, data);
      }
    }
  
    /**
     * Log a warning message
     */
    warn(message: string, data?: any): void {
      if (this.level >= LogLevel.WARN) {
        this.log(LogLevel.WARN, message, data);
      }
    }
  
    /**
     * Log an info message
     */
    info(message: string, data?: any): void {
      if (this.level >= LogLevel.INFO) {
        this.log(LogLevel.INFO, message, data);
      }
    }
  
    /**
     * Log a debug message
     */
    debug(message: string, data?: any): void {
      if (this.level >= LogLevel.DEBUG) {
        this.log(LogLevel.DEBUG, message, data);
      }
    }
  
    /**
     * Core logging method
     */
    private log(level: LogLevel, message: string, data?: any): void {
      const timestamp = new Date().toISOString();
      const levelStr = LogLevel[level];
      const contextStr = this.context ? `[${this.context}]` : '';
      
      const logEntry: LogEntry = {
        timestamp,
        level: levelStr,
        message,
        data,
        context: this.context
      };
  
      // Add to history (with size limit)
      this.logHistory.push(logEntry);
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.shift();
      }
  
      // Format for console output
      const formattedMessage = this.formatMessage(timestamp, levelStr, contextStr, message, data);
      
      // Output to appropriate console method
      switch (level) {
        case LogLevel.ERROR:
          console.error(formattedMessage);
          break;
        case LogLevel.WARN:
          console.warn(formattedMessage);
          break;
        case LogLevel.INFO:
          console.info(formattedMessage);
          break;
        case LogLevel.DEBUG:
          console.debug(formattedMessage);
          break;
      }
    }
  
    /**
     * Format message for console output
     */
    private formatMessage(
      timestamp: string,
      level: string,
      context: string,
      message: string,
      data?: any
    ): string {
      const baseMessage = `[${timestamp}] ${level.padEnd(5)} ${context} ${message}`;
      
      if (data !== undefined) {
        if (typeof data === 'object' && data !== null) {
          return `${baseMessage}\n${JSON.stringify(data, null, 2)}`;
        } else {
          return `${baseMessage} ${data}`;
        }
      }
      
      return baseMessage;
    }
  
    /**
     * Get recent log entries
     */
    getHistory(limit?: number): LogEntry[] {
      if (limit) {
        return this.logHistory.slice(-limit);
      }
      return [...this.logHistory];
    }
  
    /**
     * Get log entries filtered by level
     */
    getHistoryByLevel(level: LogLevel, limit?: number): LogEntry[] {
      const levelStr = LogLevel[level];
      const filtered = this.logHistory.filter(entry => entry.level === levelStr);
      
      if (limit) {
        return filtered.slice(-limit);
      }
      return filtered;
    }
  
    /**
     * Clear log history
     */
    clearHistory(): void {
      this.logHistory = [];
    }
  
    /**
     * Get log statistics
     */
    getStats(): {
      totalLogs: number;
      errorCount: number;
      warnCount: number;
      infoCount: number;
      debugCount: number;
      oldestEntry?: string | undefined;
      newestEntry?: string | undefined;
    } {
      const stats: {
        totalLogs: number;
        errorCount: number;
        warnCount: number;
        infoCount: number;
        debugCount: number;
        oldestEntry?: string | undefined;
        newestEntry?: string | undefined;
      } = {
        totalLogs: this.logHistory.length,
        errorCount: 0,
        warnCount: 0,
        infoCount: 0,
        debugCount: 0,
        oldestEntry: undefined,
        newestEntry: undefined
      };
  
      if (this.logHistory.length > 0) {
        stats.oldestEntry = this.logHistory[0].timestamp;
        stats.newestEntry = this.logHistory[this.logHistory.length - 1].timestamp;
      }
  
      this.logHistory.forEach(entry => {
        switch (entry.level) {
          case 'ERROR':
            stats.errorCount++;
            break;
          case 'WARN':
            stats.warnCount++;
            break;
          case 'INFO':
            stats.infoCount++;
            break;
          case 'DEBUG':
            stats.debugCount++;
            break;
        }
      });
  
      return stats;
    }
  
    /**
     * Export logs as JSON
     */
    exportLogs(): string {
      return JSON.stringify(this.logHistory, null, 2);
    }
  
    /**
     * Time a function execution and log the result
     */
    async time<T>(
      label: string,
      fn: () => Promise<T>,
      logLevel: LogLevel = LogLevel.DEBUG
    ): Promise<T> {
      const startTime = Date.now();
      
      try {
        const result = await fn();
        const duration = Date.now() - startTime;
        
        this.log(logLevel, `${label} completed in ${duration}ms`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.error(`${label} failed after ${duration}ms`, error);
        throw error;
      }
    }
  
    /**
     * Time a synchronous function execution
     */
    timeSync<T>(
      label: string,
      fn: () => T,
      logLevel: LogLevel = LogLevel.DEBUG
    ): T {
      const startTime = Date.now();
      
      try {
        const result = fn();
        const duration = Date.now() - startTime;
        
        this.log(logLevel, `${label} completed in ${duration}ms`);
        
        return result;
      } catch (error) {
        const duration = Date.now() - startTime;
        
        this.error(`${label} failed after ${duration}ms`, error);
        throw error;
      }
    }
  
    /**
     * Create a performance marker
     */
    mark(label: string): () => void {
      const startTime = Date.now();
      
      return () => {
        const duration = Date.now() - startTime;
        this.debug(`Performance: ${label} took ${duration}ms`);
      };
    }
  
    /**
     * Log with custom level (for special cases)
     */
    custom(level: string, message: string, data?: any): void {
      const timestamp = new Date().toISOString();
      const contextStr = this.context ? `[${this.context}]` : '';
      
      const logEntry: LogEntry = {
        timestamp,
        level,
        message,
        data,
        context: this.context
      };
  
      this.logHistory.push(logEntry);
      if (this.logHistory.length > this.maxHistorySize) {
        this.logHistory.shift();
      }
  
      const formattedMessage = this.formatMessage(timestamp, level, contextStr, message, data);
      console.log(formattedMessage);
    }
  
    /**
     * Create a logger instance from environment variables
     */
    static fromEnv(context?: string): Logger {
      const levelStr = process.env.LOG_LEVEL || 'info';
      let level: LogLevel;
      
      switch (levelStr.toLowerCase()) {
        case 'error':
          level = LogLevel.ERROR;
          break;
        case 'warn':
        case 'warning':
          level = LogLevel.WARN;
          break;
        case 'info':
          level = LogLevel.INFO;
          break;
        case 'debug':
          level = LogLevel.DEBUG;
          break;
        default:
          level = LogLevel.INFO;
      }
      
      const maxHistory = parseInt(process.env.LOG_HISTORY_SIZE || '1000', 10);
      
      return new Logger(level, context, maxHistory);
    }
  
    /**
     * Create a structured log entry for API requests
     */
    request(
      method: string,
      url: string,
      statusCode?: number,
      duration?: number,
      userAgent?: string
    ): void {
      const logData = {
        method,
        url,
        statusCode,
        duration,
        userAgent,
        type: 'request'
      };
  
      if (statusCode && statusCode >= 400) {
        this.warn(`${method} ${url} ${statusCode}`, logData);
      } else {
        this.info(`${method} ${url} ${statusCode || 'pending'}`, logData);
      }
    }
  
    /**
     * Log API response details
     */
    response(
      url: string,
      statusCode: number,
      responseSize?: number,
      cacheHit?: boolean
    ): void {
      const logData = {
        url,
        statusCode,
        responseSize,
        cacheHit,
        type: 'response'
      };
  
      if (statusCode >= 400) {
        this.error(`API Error: ${url} returned ${statusCode}`, logData);
      } else {
        this.debug(`API Success: ${url} returned ${statusCode}`, logData);
      }
    }
  
    /**
     * Log database operation
     */
    database(
      operation: string,
      table?: string,
      duration?: number,
      recordCount?: number
    ): void {
      const logData = {
        operation,
        table,
        duration,
        recordCount,
        type: 'database'
      };
  
      this.debug(`DB: ${operation} ${table || ''}`, logData);
    }
  
    /**
     * Log security-related events
     */
    security(
      event: string,
      severity: 'low' | 'medium' | 'high' | 'critical',
      details?: any
    ): void {
      const logData = {
        event,
        severity,
        details,
        type: 'security'
      };
  
      switch (severity) {
        case 'critical':
        case 'high':
          this.error(`SECURITY: ${event}`, logData);
          break;
        case 'medium':
          this.warn(`SECURITY: ${event}`, logData);
          break;
        case 'low':
          this.info(`SECURITY: ${event}`, logData);
          break;
      }
    }
  }