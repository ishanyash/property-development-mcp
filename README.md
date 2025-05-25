# Property Development MCP Agent

An AI-powered Model Context Protocol (MCP) server that provides comprehensive property development analysis and reporting for UK properties. Built for property developers, investors, and surveyors to automate feasibility studies and development potential assessments.

## Features

- **Comprehensive Property Analysis**: Automated data collection from multiple sources
- **Financial Modeling**: Calculate maximum acquisition prices for 25% profit margins
- **Planning Assessment**: Identify permitted development rights and constraints
- **Market Analysis**: Compare properties and analyze local market trends
- **Professional Reporting**: Generate RICS-standard development reports
- **Risk Assessment**: Evaluate investment risks and opportunities

## Installation

### Prerequisites
- Node.js 18+ 
- TypeScript
- API keys for various property data sources

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/property-development-mcp.git
cd property-development-mcp

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env file with your API keys
nano .env

# Build the project
npm run build

# Start the server
npm start
```

### Environment Configuration

Create a `.env` file with the following variables:

```bash
GOOGLE_PLACES_API_KEY=your_api_key_here
MAX_REQUESTS_PER_MINUTE=60
CACHE_DURATION_MINUTES=30
NODE_ENV=development
```

## Usage

### MCP Integration

Add to your Claude Desktop MCP configuration:

```json
{
  "mcpServers": {
    "property-development": {
      "command": "node",
      "args": ["/path/to/property-development-mcp/dist/server.js"]
    }
  }
}
```

### Available Tools

1. **analyze_property**: Analyze a property for development potential
2. **generate_development_report**: Generate comprehensive property development reports

### Example Usage

```
Generate a comprehensive development report for "123 High Street, London, SW1A 1AA"
```

## Report Types

### Full Report
- Executive Summary
- Property Appraisal and Valuation
- Feasibility Study and Profitability Analysis
- Planning Opportunities Assessment
- Local Area Commentary
- Investment Recommendations

### Summary Report
- Quick financial overview
- Key opportunities and risks
- Recommended strategy

### Feasibility Report
- Detailed financial modeling
- Scenario comparisons
- ROI calculations

## Data Sources

- **Land Registry**: Historical sale prices and property details
- **Planning Portals**: Planning applications and permissions
- **Google Places**: Transport links and local amenities
- **Rightmove**: Current market listings and trends
- **Local Authority APIs**: Planning constraints and regulations

## Financial Modeling

The agent calculates development scenarios including:

- **Light Refurbishment**: £60-75 per sq ft
- **Conversions**: £180 per sq ft
- **New Builds**: £225 per sq ft
- **HMO Conversions**: £30,000 per room

All calculations target a minimum 25% profit on cost.

## Development

### Scripts

```bash
npm run dev          # Development mode with hot reload
npm run build        # Build TypeScript to JavaScript
npm run test         # Run test suite
npm run lint         # Check code style
npm run lint:fix     # Fix linting issues
```

### Testing

```bash
npm test             # Run all tests
npm run test:watch   # Run tests in watch mode
```

### Project Structure

```
src/
├── server.ts                 # Main MCP server
├── services/
│   ├── PropertyAnalyzer.ts   # Property data collection
│   ├── ReportGenerator.ts    # Report generation
│   ├── CacheService.ts       # Data caching
│   └── RateLimiter.ts        # API rate limiting
├── utils/
│   └── Logger.ts             # Logging utility
└── __tests__/
    └── PropertyAnalyzer.test.ts
```

## API Rate Limits

The agent implements rate limiting to respect API quotas:
- Default: 60 requests per minute
- Configurable via environment variables
- Automatic caching to reduce API calls

## Security

- API keys stored in environment variables
- Input validation on all user data
- Rate limiting to prevent abuse
- Secure error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Disclaimer

This tool provides automated property analysis for informational purposes only. Always consult with qualified professionals before making investment decisions. The accuracy of data depends on third-party sources and market conditions.

## Support

For issues and questions:
- Create an issue on GitHub
- Check the documentation
- Review the example configurations

## Changelog

### v1.0.0
- Initial release
- Basic property analysis
- Report generation
- MCP server implementation