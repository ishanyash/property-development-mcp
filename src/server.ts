import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { PropertyAnalyzer } from './services/PropertyAnalyzer.js';
import { ReportGenerator } from './services/ReportGenerator.js';
import { Logger, LogLevel } from './utils/Logger.js';
import { RateLimiter } from './services/RateLimiter.js';
import { CacheService } from './services/CacheService.js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

class PropertyDevelopmentServer {
  private server: Server;
  private propertyAnalyzer: PropertyAnalyzer;
  private reportGenerator: ReportGenerator;
  private logger: Logger;
  private rateLimiter: RateLimiter;
  private cache: CacheService;

  constructor() {
    // Initialize services
    this.logger = new Logger(
      process.env.LOG_LEVEL === 'debug' ? LogLevel.DEBUG : LogLevel.INFO
    );
    this.rateLimiter = new RateLimiter(
      parseInt(process.env.MAX_REQUESTS_PER_MINUTE || '60'),
      60000 // 1 minute window
    );
    this.cache = new CacheService();

    // Initialize MCP server - only pass the first parameter
    this.server = new Server({
      name: 'property-development-agent',
      version: '1.0.0',
    });

    this.propertyAnalyzer = new PropertyAnalyzer(this.logger, this.cache);
    this.reportGenerator = new ReportGenerator(this.logger);
    this.setupToolHandlers();
    
    this.logger.info('Property Development MCP Server initialized');
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.logger.debug('Listing available tools');
      
      return {
        tools: [
          {
            name: 'analyze_property',
            description: 'Analyze a property for development potential and gather comprehensive data',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'Full UK property address including postcode',
                },
                analysisType: {
                  type: 'string',
                  enum: ['basic', 'comprehensive'],
                  description: 'Type of analysis to perform',
                  default: 'comprehensive'
                }
              },
              required: ['address'],
            },
          },
          {
            name: 'generate_development_report',
            description: 'Generate comprehensive property development report with financial analysis',
            inputSchema: {
              type: 'object',
              properties: {
                address: {
                  type: 'string',
                  description: 'Property address to analyze',
                },
                reportType: {
                  type: 'string',
                  enum: ['full', 'summary', 'feasibility'],
                  description: 'Type of report to generate',
                  default: 'full'
                },
                targetProfit: {
                  type: 'number',
                  description: 'Target profit margin (0.25 for 25%)',
                  default: 0.25
                }
              },
              required: ['address'],
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const clientId = 'default'; // In a real implementation, extract from request context

      this.logger.info(`Tool called: ${name}`, { args });

      // Check rate limits
      if (!this.rateLimiter.canMakeRequest(clientId)) {
        this.logger.warn(`Rate limit exceeded for client: ${clientId}`);
        return {
          content: [
            {
              type: 'text',
              text: 'Rate limit exceeded. Please try again later.',
            },
          ],
          isError: true,
        };
      }

      try {
        if (!args) {
          throw new Error('No arguments provided');
        }

        switch (name) {
          case 'analyze_property':
            return await this.analyzeProperty(
              args.address as string,
              (args.analysisType as string) || 'comprehensive'
            );
          
          case 'generate_development_report':
            return await this.generateReport(
              args.address as string,
              (args.reportType as string) || 'full',
              (args.targetProfit as number) || 0.25
            );
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        this.logger.error(`Error executing tool ${name}:`, error);
        
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  private async analyzeProperty(address: string, analysisType: string) {
    this.logger.info(`Analyzing property: ${address} (${analysisType})`);
    
    try {
      // Check cache first
      const cacheKey = `analysis_${address}_${analysisType}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        this.logger.debug('Returning cached analysis');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(cached, null, 2),
            },
          ],
        };
      }

      // Perform analysis
      const analysis = await this.propertyAnalyzer.analyze(address, analysisType);
      
      // Cache the result
      this.cache.set(cacheKey, analysis);
      
      this.logger.info(`Analysis completed for: ${address}`);
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(analysis, null, 2),
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to analyze property ${address}:`, error);
      throw error;
    }
  }

  private async generateReport(address: string, reportType: string, targetProfit: number) {
    this.logger.info(`Generating ${reportType} report for: ${address}`);
    
    try {
      // Check cache first
      const cacheKey = `report_${address}_${reportType}_${targetProfit}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        this.logger.debug('Returning cached report');
        return {
          content: [
            {
              type: 'text',
              text: cached,
            },
          ],
        };
      }

      // Generate report
      const report = await this.reportGenerator.generate(address, reportType, targetProfit);
      
      // Cache the result
      this.cache.set(cacheKey, report);
      
      this.logger.info(`Report generated for: ${address}`);
      
      return {
        content: [
          {
            type: 'text',
            text: report,
          },
        ],
      };
    } catch (error) {
      this.logger.error(`Failed to generate report for ${address}:`, error);
      throw error;
    }
  }

  async run() {
    try {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      this.logger.info('Property Development MCP server running on stdio');
      
      // Graceful shutdown handling
      process.on('SIGINT', () => {
        this.logger.info('Received SIGINT, shutting down gracefully...');
        this.cache.clear();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        this.logger.info('Received SIGTERM, shutting down gracefully...');
        this.cache.clear();
        process.exit(0);
      });

    } catch (error) {
      this.logger.error('Failed to start MCP server:', error);
      process.exit(1);
    }
  }
}

// Error handling for unhandled promises
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
  process.exit(1);
});

// Start the server
const server = new PropertyDevelopmentServer();
server.run().catch((error) => {
  console.error('Server startup failed:', error);
  process.exit(1);
});