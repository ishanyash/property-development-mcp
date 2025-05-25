import { PropertyAnalyzer, PropertyData } from './PropertyAnalyzer.js';
import { Logger } from '../utils/Logger.js';

interface DevelopmentScenario {
  strategy: string;
  refurbCost: number;
  gdv: number;
  maxAcquisitionPrice: number;
  profit: number;
  profitMargin: number;
  roi: number;
  timeline: string;
  risks: string[];
}

interface FinancialCosts {
  acquisition: number;
  finance: number;
  selling: number;
  profit: number;
}

export class ReportGenerator {
  private propertyAnalyzer: PropertyAnalyzer;

  constructor(private logger: Logger) {
    this.propertyAnalyzer = new PropertyAnalyzer(logger, {} as any); // Cache will be injected properly
  }

  async generate(address: string, reportType: string = 'full', targetProfit: number = 0.25): Promise<string> {
    this.logger.info(`Generating ${reportType} report for: ${address}`);
    
    try {
      const propertyData = await this.propertyAnalyzer.analyze(address, 'comprehensive');
      
      switch (reportType) {
        case 'summary':
          return this.generateSummaryReport(propertyData, targetProfit);
        case 'feasibility':
          return this.generateFeasibilityReport(propertyData, targetProfit);
        default:
          return this.generateFullReport(propertyData, targetProfit);
      }
    } catch (error) {
      this.logger.error(`Report generation failed for ${address}:`, error);
      throw new Error(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private generateFullReport(data: PropertyData, targetProfit: number): string {
    const scenarios = this.calculateDevelopmentScenarios(data, targetProfit);
    const financialCosts = this.getFinancialCosts(targetProfit);
    
    return `# PROPERTY DEVELOPMENT FEASIBILITY REPORT

**Property Address:** ${data.address}
**Report Date:** ${new Date().toDateString()}
**Analysis Date:** ${new Date(data.analysisDate).toDateString()}
**Prepared by:** AI Property Development Agent
**Data Quality Score:** ${data.dataQuality.overallScore}/100

---

## 1. EXECUTIVE SUMMARY

### Property Overview
- **Current Use Class:** ${data.useClass}
- **Property Type:** ${data.propertyType}
- **Bedrooms:** ${data.bedrooms || 'Unknown'}
- **Current Market Valuation:** £${data.currentValue.toLocaleString()}
- **Local Authority:** ${data.localAuthority}
- **Tenure:** ${data.tenure}

### Key Findings
- **Development Potential:** ${this.assessDevelopmentPotential(data)}
- **Planning Constraints:** ${this.summarizePlanningConstraints(data)}
- **Recommended Strategy:** ${scenarios.recommended.strategy}

### Financial Summary
- **Maximum Acquisition Price:** £${scenarios.recommended.maxAcquisitionPrice.toLocaleString()}
- **Estimated Development Cost:** £${scenarios.recommended.refurbCost.toLocaleString()}
- **Gross Development Value:** £${scenarios.recommended.gdv.toLocaleString()}
- **Projected Profit:** £${scenarios.recommended.profit.toLocaleString()} (${scenarios.recommended.profitMargin.toFixed(1)}%)
- **Return on Investment:** ${scenarios.recommended.roi.toFixed(1)}%
- **Development Timeline:** ${scenarios.recommended.timeline}

${this.generateDataQualityWarnings(data.dataQuality)}

---

## 2. PROPERTY APPRAISAL AND VALUATION

### 2.1 Use Class Verification
**Current Use Class:** ${data.useClass}
**Verification Status:** ${data.useClass !== 'Unknown' ? 'Confirmed via local authority records' : 'Requires verification - recommend direct enquiry with planning department'}

### 2.2 Market Valuation
**Current Market Value:** £${data.currentValue.toLocaleString()}
**Valuation Method:** Comparative market analysis
**Confidence Level:** ${this.getValuationConfidence(data)}
**Floor Area (Estimated):** ${this.estimateFloorArea(data)} sq ft

**Refurbishment Cost Benchmarks:**
- Light refurbishment: £60-75 per sq ft
- Office to residential conversion: £180 per sq ft  
- New build construction: £225 per sq ft
- HMO conversion: £30,000 per room

### 2.3 Comparable Properties Analysis

${data.comparables.length > 0 ? `
| Address | Sale Price | Sale Date | Type | Beds | Price/SqFt | Distance | Rating | Source |
|---------|------------|-----------|------|------|------------|----------|---------|---------|
${data.comparables.slice(0, 8).map(comp => 
`| ${comp.address.substring(0, 30)}... | £${comp.price.toLocaleString()} | ${comp.saleDate} | ${comp.propertyType} | ${comp.bedrooms} | £${comp.pricePerSqFt.toFixed(0)} | ${comp.distance.toFixed(1)}km | ${comp.rating} | ${comp.source} |`
).join('\n')}

**Comparable Analysis Notes:**
- ${data.comparables.filter(c => c.rating === 'High').length} high-quality comparables identified
- Average sale price: £${(data.comparables.reduce((sum, c) => sum + c.price, 0) / data.comparables.length).toLocaleString()}
- Most recent sales within ${Math.min(...data.comparables.map(c => Math.round((Date.now() - new Date(c.saleDate).getTime()) / (1000 * 60 * 60 * 24 * 30))))} months
` : `
**No comparable sales data available** - Valuation based on area estimates and property characteristics.
Recommend obtaining professional valuation for accurate market assessment.
`}

---

## 3. FEASIBILITY STUDY AND PROFITABILITY ANALYSIS

### 3.1 Development Scenarios

#### Scenario 1: ${scenarios.refurbSell.strategy}
- **Development Cost:** £${scenarios.refurbSell.refurbCost.toLocaleString()}
- **Post-Development Value:** £${scenarios.refurbSell.gdv.toLocaleString()}
- **Maximum Acquisition Price:** £${scenarios.refurbSell.maxAcquisitionPrice.toLocaleString()}
- **Projected Profit:** £${scenarios.refurbSell.profit.toLocaleString()} (${scenarios.refurbSell.profitMargin.toFixed(1)}%)
- **Return on Investment:** ${scenarios.refurbSell.roi.toFixed(1)}%
- **Timeline:** ${scenarios.refurbSell.timeline}
- **Key Risks:** ${scenarios.refurbSell.risks.join(', ')}

#### Scenario 2: ${scenarios.extendConvert.strategy}
- **Development Cost:** £${scenarios.extendConvert.refurbCost.toLocaleString()}
- **Post-Development Value:** £${scenarios.extendConvert.gdv.toLocaleString()}
- **Maximum Acquisition Price:** £${scenarios.extendConvert.maxAcquisitionPrice.toLocaleString()}
- **Projected Profit:** £${scenarios.extendConvert.profit.toLocaleString()} (${scenarios.extendConvert.profitMargin.toFixed(1)}%)
- **Return on Investment:** ${scenarios.extendConvert.roi.toFixed(1)}%
- **Timeline:** ${scenarios.extendConvert.timeline}
- **Key Risks:** ${scenarios.extendConvert.risks.join(', ')}

### 3.2 Financial Assumptions
- **Target Profit Margin:** ${(targetProfit * 100).toFixed(0)}%
- **Finance Rate:** ${(financialCosts.finance * 100).toFixed(1)}% per annum
- **Acquisition Costs:** ${(financialCosts.acquisition * 100).toFixed(1)}% of purchase price
- **Selling Costs:** ${(financialCosts.selling * 100).toFixed(1)}% of GDV
- **Financing:** 100% Loan to Cost assumed

### 3.3 Risk-Adjusted Analysis
${this.generateRiskAssessment(data, scenarios)}

---

## 4. PLANNING OPPORTUNITIES AND DEVELOPMENT POTENTIAL

### 4.1 Permitted Development Assessment
${this.assessPDRights(data)}

### 4.2 Planning History
${data.planningHistory.length > 0 ? `
Recent planning applications:
${data.planningHistory.map(app => 
`- **${app.reference}:** ${app.description}
  Status: ${app.status} (${app.date})
  ${app.decision ? `Decision: ${app.decision}` : ''}
  ${app.url ? `[View Application](${app.url})` : ''}`
).join('\n')}
` : 'No recent planning applications found for this property.'}

### 4.3 Development Opportunities
${this.identifyDevelopmentOpportunities(data)}

### 4.4 Planning Constraints
${this.generatePlanningConstraints(data)}

---

## 5. LOCAL AREA COMMENTARY

### 5.1 Transport Connectivity
${data.transportLinks.length > 0 ? `
**Nearby Transport Links:**
${data.transportLinks.map(transport => 
`- **${transport.name}** (${transport.type}): ${transport.distance.toFixed(1)}km away, ${transport.walkingTime} min walk
  ${transport.zones && transport.zones.length > 0 ? `Travel Zones: ${transport.zones.join(', ')}` : ''}`
).join('\n')}

**Transport Score:** ${this.calculateTransportScore(data.transportLinks)}/10
` : 'Limited transport information available.'}

### 5.2 Local Amenities
${this.categorizeAmenities(data.localAmenities)}

### 5.3 Market Analysis
- **Average Local Property Price:** £${data.marketTrends.averagePrice.toLocaleString()}
- **1-Year Price Change:** ${data.marketTrends.priceChange1Year > 0 ? '+' : ''}${data.marketTrends.priceChange1Year.toFixed(1)}%
- **5-Year Price Change:** ${data.marketTrends.priceChange5Year > 0 ? '+' : ''}${data.marketTrends.priceChange5Year.toFixed(1)}%
- **Average Time on Market:** ${data.marketTrends.timeOnMarket} days
- **Market Demand Level:** ${data.marketTrends.demandLevel}
- **Price Accuracy:** ${(data.marketTrends.soldPriceAccuracy * 100).toFixed(0)}% of asking price achieved

### 5.4 Investment Climate
${this.assessInvestmentClimate(data)}

---

## 6. CONCLUSION AND INVESTMENT RECOMMENDATION

### 6.1 Investment Recommendation: ${scenarios.recommended.strategy}

**Overall Assessment:** ${this.getOverallAssessment(data, scenarios)}

**Key Investment Rationale:**
${this.generateInvestmentRationale(data, scenarios)}

**Critical Success Factors:**
${this.generateSuccessFactors(data, scenarios)}

### 6.2 Recommended Action Plan

**Immediate Next Steps:**
1. **Due Diligence:** Commission full structural survey and specialist reports
2. **Planning Consultation:** Arrange pre-application discussion with local planning authority
3. **Financial Arrangements:** Secure development finance at competitive rates
4. **Acquisition Strategy:** Negotiate purchase at maximum £${scenarios.recommended.maxAcquisitionPrice.toLocaleString()}

**Development Phase:**
1. Obtain all necessary permits and approvals
2. Appoint reputable contractors with fixed-price contracts
3. Implement regular progress monitoring and cost control
4. Maintain 10% contingency for unforeseen costs

**Exit Strategy:**
1. Market property 4-6 weeks before completion
2. Target premium end of market for maximum value
3. Consider rental strategy if market conditions unfavorable

---

**DISCLAIMER:** This report is generated through automated analysis and should be used for initial assessment purposes only. All figures are estimates based on available data and market assumptions. Professional advice should be sought from qualified surveyors, planners, and financial advisors before making investment decisions. Market conditions can change rapidly, and actual results may vary significantly from projections.

**Report Confidence Level:** ${data.dataQuality.overallScore}/100
${data.dataQuality.warnings.length > 0 ? `\n**Data Quality Warnings:** ${data.dataQuality.warnings.join('; ')}` : ''}

---
*Report generated on ${new Date().toISOString()} by Property Development MCP Agent v1.0*`;
  }

  private generateSummaryReport(data: PropertyData, targetProfit: number): string {
    const scenarios = this.calculateDevelopmentScenarios(data, targetProfit);
    
    return `# PROPERTY DEVELOPMENT SUMMARY

**Address:** ${data.address}
**Current Value:** £${data.currentValue.toLocaleString()}
**Property Type:** ${data.propertyType} (${data.bedrooms || 'Unknown'} bedrooms)
**Data Quality:** ${data.dataQuality.overallScore}/100

## QUICK ANALYSIS
- **Best Strategy:** ${scenarios.recommended.strategy}
- **Max Acquisition Price:** £${scenarios.recommended.maxAcquisitionPrice.toLocaleString()}
- **Development Cost:** £${scenarios.recommended.refurbCost.toLocaleString()}
- **Expected Profit:** £${scenarios.recommended.profit.toLocaleString()} (${scenarios.recommended.profitMargin.toFixed(1)}%)
- **ROI:** ${scenarios.recommended.roi.toFixed(1)}%
- **Timeline:** ${scenarios.recommended.timeline}

## KEY OPPORTUNITIES
${this.identifyDevelopmentOpportunities(data)}

## MAJOR RISKS
${this.identifyMajorRisks(data)}

## MARKET CONTEXT
- **Local Average Price:** £${data.marketTrends.averagePrice.toLocaleString()}
- **1-Year Growth:** ${data.marketTrends.priceChange1Year > 0 ? '+' : ''}${data.marketTrends.priceChange1Year.toFixed(1)}%
- **Market Demand:** ${data.marketTrends.demandLevel}
- **Time on Market:** ${data.marketTrends.timeOnMarket} days

## RECOMMENDATION
${scenarios.recommended.roi > 20 ? '✅ **PROCEED** - Strong investment opportunity' : 
  scenarios.recommended.roi > 15 ? '⚠️ **CAUTION** - Marginal investment, conduct detailed analysis' : 
  '❌ **AVOID** - Returns below target threshold'}

${this.generateDataQualityWarnings(data.dataQuality)}

*Generated: ${new Date().toDateString()}*`;
  }

  private generateFeasibilityReport(data: PropertyData, targetProfit: number): string {
    const scenarios = this.calculateDevelopmentScenarios(data, targetProfit);
    
    return `# DEVELOPMENT FEASIBILITY ANALYSIS

**Property:** ${data.address}
**Analysis Date:** ${new Date().toDateString()}
**Target Profit Margin:** ${(targetProfit * 100).toFixed(0)}%

## FINANCIAL FEASIBILITY COMPARISON

| Scenario | Max Acquisition | Development Cost | GDV | Profit | Margin | ROI | Timeline |
|----------|-----------------|------------------|-----|--------|--------|-----|----------|
| **${scenarios.refurbSell.strategy}** | £${scenarios.refurbSell.maxAcquisitionPrice.toLocaleString()} | £${scenarios.refurbSell.refurbCost.toLocaleString()} | £${scenarios.refurbSell.gdv.toLocaleString()} | £${scenarios.refurbSell.profit.toLocaleString()} | ${scenarios.refurbSell.profitMargin.toFixed(1)}% | ${scenarios.refurbSell.roi.toFixed(1)}% | ${scenarios.refurbSell.timeline} |
| **${scenarios.extendConvert.strategy}** | £${scenarios.extendConvert.maxAcquisitionPrice.toLocaleString()} | £${scenarios.extendConvert.refurbCost.toLocaleString()} | £${scenarios.extendConvert.gdv.toLocaleString()} | £${scenarios.extendConvert.profit.toLocaleString()} | ${scenarios.extendConvert.profitMargin.toFixed(1)}% | ${scenarios.extendConvert.roi.toFixed(1)}% | ${scenarios.extendConvert.timeline} |

## RECOMMENDED STRATEGY: ${scenarios.recommended.strategy}

**Financial Justification:**
${this.getStrategyJustification(scenarios.recommended, scenarios)}

**Key Assumptions:**
- Current market value: £${data.currentValue.toLocaleString()}
- Floor area (estimated): ${this.estimateFloorArea(data)} sq ft
- ${(targetProfit * 100).toFixed(0)}% profit margin target
- 14% annual finance rate (100% LTC)
- ${this.getFinancialCosts(targetProfit).selling * 100}% selling costs

## RECOMMENDATION SUMMARY
**Investment Grade:** ${this.getInvestmentGrade(scenarios.recommended)}
**Risk Level:** ${this.getRiskLevel(data, scenarios.recommended)}
**Market Timing:** ${this.getMarketTiming(data)}

${this.generateDataQualityWarnings(data.dataQuality)}`;
  }

  private calculateDevelopmentScenarios(data: PropertyData, targetProfit: number): {
    refurbSell: DevelopmentScenario;
    extendConvert: DevelopmentScenario;
    recommended: DevelopmentScenario;
  } {
    const estimatedFloorArea = this.estimateFloorArea(data);
    const costs = this.getFinancialCosts(targetProfit);

    // Scenario 1: Light refurbishment
    const lightRefurbCostPsf = 70;
    const lightRefurbCost = estimatedFloorArea * lightRefurbCostPsf;
    const lightRefurbGDV = Math.max(data.currentValue * 1.15, data.currentValue + lightRefurbCost * 1.3);

    // Scenario 2: Extension/conversion
    const extensionCostPsf = 200;
    const extensionSize = Math.floor(estimatedFloorArea * 0.3);
    const extensionCost = extensionSize * extensionCostPsf;
    const conversionCost = estimatedFloorArea * 100;
    const totalExtensionCost = extensionCost + conversionCost;
    const extensionGDV = Math.max(data.currentValue * 1.35, data.currentValue + totalExtensionCost * 1.4);

    const refurbSellMaxAcq = this.calculateMaxAcquisition(lightRefurbGDV, lightRefurbCost, costs);
    const extendConvertMaxAcq = this.calculateMaxAcquisition(extensionGDV, totalExtensionCost, costs);

    const refurbSellScenario: DevelopmentScenario = {
      strategy: 'Light Refurbishment and Sale',
      refurbCost: lightRefurbCost,
      gdv: lightRefurbGDV,
      maxAcquisitionPrice: refurbSellMaxAcq,
      profit: this.calculateProfit(lightRefurbGDV, refurbSellMaxAcq, lightRefurbCost, costs),
      profitMargin: targetProfit * 100,
      roi: this.calculateROI(lightRefurbGDV, refurbSellMaxAcq, lightRefurbCost, costs),
      timeline: '4-6 months',
      risks: ['Market conditions', 'Unforeseen structural issues', 'Planning delays for internal works']
    };

    const extendConvertScenario: DevelopmentScenario = {
      strategy: 'Extend and Convert',
      refurbCost: totalExtensionCost,
      gdv: extensionGDV,
      maxAcquisitionPrice: extendConvertMaxAcq,
      profit: this.calculateProfit(extensionGDV, extendConvertMaxAcq, totalExtensionCost, costs),
      profitMargin: targetProfit * 100,
      roi: this.calculateROI(extensionGDV, extendConvertMaxAcq, totalExtensionCost, costs),
      timeline: '8-12 months',
      risks: ['Planning permission required', 'Building regulations', 'Higher construction costs', 'Extended timeline risk']
    };

    const recommended = refurbSellScenario.roi > extendConvertScenario.roi && 
                      refurbSellScenario.maxAcquisitionPrice > data.currentValue * 0.8 ? 
                      refurbSellScenario : extendConvertScenario;

    return {
      refurbSell: refurbSellScenario,
      extendConvert: extendConvertScenario,
      recommended: recommended
    };
  }

  private calculateMaxAcquisition(gdv: number, developmentCost: number, costs: FinancialCosts): number {
    const netGDV = gdv * (1 - costs.selling);
    const availableForAcqAndDev = netGDV / (1 + costs.profit);
    const maxAcquisition = (availableForAcqAndDev - developmentCost) / (1 + costs.acquisition + costs.finance);
    
    return Math.max(0, maxAcquisition);
  }

  private calculateProfit(gdv: number, acquisition: number, developmentCost: number, costs: FinancialCosts): number {
    const totalCosts = acquisition + developmentCost + (acquisition * costs.acquisition) + 
                      ((acquisition + developmentCost) * costs.finance) + (gdv * costs.selling);
    return gdv - totalCosts;
  }

  private calculateROI(gdv: number, acquisition: number, developmentCost: number, costs: FinancialCosts): number {
    const profit = this.calculateProfit(gdv, acquisition, developmentCost, costs);
    const totalInvestment = acquisition + developmentCost;
    return totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;
  }

  private getFinancialCosts(targetProfit: number): FinancialCosts {
    return {
      acquisition: parseFloat(process.env.ACQUISITION_COST_RATE || '0.05'),
      finance: parseFloat(process.env.FINANCE_RATE || '0.14'),
      selling: parseFloat(process.env.SELLING_COST_RATE || '0.03'),
      profit: targetProfit
    };
  }

  private estimateFloorArea(data: PropertyData): number {
    if (data.floorArea) return data.floorArea;
    
    const baseArea: { [key: string]: number } = {
      'terraced': 85,
      'semi-detached': 95,
      'detached': 120,
      'flat': 65,
      'apartment': 65,
      'bungalow': 90
    };
    
    const propertyTypeKey = Object.keys(baseArea).find(key => 
      data.propertyType.toLowerCase().includes(key)
    ) || 'terraced';
    
    const base = baseArea[propertyTypeKey];
    const bedroomMultiplier = Math.max(1, data.bedrooms || 2);
    
    return Math.round(base * bedroomMultiplier * 0.8);
  }

  private assessDevelopmentPotential(data: PropertyData): string {
    const potentials = [];
    
    if (data.bedrooms && data.bedrooms >= 3) {
      potentials.push('HMO conversion potential');
    }
    
    if (!data.conservationArea && !data.listedBuilding) {
      potentials.push('Extension opportunities under PD rights');
    }
    
    if (data.useClass === 'C3') {
      potentials.push('Residential refurbishment and modernization');
    }

    if (data.propertyType.toLowerCase().includes('terraced')) {
      potentials.push('Side return extension potential');
    }
    
    return potentials.length > 0 ? potentials.join(', ') : 'Limited development potential identified';
  }

  private summarizePlanningConstraints(data: PropertyData): string {
    const constraints = [];
    
    if (data.conservationArea) constraints.push('Conservation Area restrictions');
    if (data.listedBuilding) constraints.push('Listed Building consent required');
    if (data.article4Direction) constraints.push('Article 4 Direction limits PD rights');
    
    return constraints.length > 0 ? constraints.join(', ') : 'No major planning constraints identified';
  }

  private getValuationConfidence(data: PropertyData): string {
    const comparableCount = data.comparables.length;
    const highQualityComps = data.comparables.filter(comp => comp.rating === 'High').length;
    
    if (comparableCount >= 5 && highQualityComps >= 2) return 'High';
    if (comparableCount >= 3) return 'Medium';
    return 'Low - recommend professional valuation';
  }

  private generateDataQualityWarnings(dataQuality: any): string {
    if (dataQuality.warnings.length === 0) return '';
    
    return `
## ⚠️ DATA QUALITY WARNINGS
${dataQuality.warnings.map((warning: string) => `- ${warning}`).join('\n')}

**Recommendation:** Consider obtaining additional data sources or professional validation before proceeding.`;
  }

  private generateRiskAssessment(data: PropertyData, scenarios: any): string {
    const risks = [];
    
    if (data.conservationArea || data.listedBuilding) {
      risks.push('**High Risk:** Planning restrictions may significantly limit development options and increase costs');
    }
    
    if (data.marketTrends.demandLevel === 'Low') {
      risks.push('**Medium Risk:** Local market demand is currently weak, affecting sale timeline and pricing');
    }
    
    if (data.comparables.length < 3) {
      risks.push('**Medium Risk:** Limited comparable sales data increases valuation uncertainty');
    }
    
    if (data.marketTrends.timeOnMarket > 60) {
      risks.push('**Medium Risk:** Properties taking longer than average to sell in this area');
    }

    if (scenarios.recommended.roi < 20) {
      risks.push('**Medium Risk:** ROI below optimal target may indicate market or execution challenges');
    }
    
    return risks.length > 0 ? risks.join('\n\n') : '**Low Risk:** No significant risk factors identified in current analysis';
  }

  private assessPDRights(data: PropertyData): string {
    if (data.conservationArea || data.article4Direction) {
      return `**Restricted Permitted Development Rights**
- Conservation Area designation limits standard PD rights
- All external alterations require planning permission
- Internal structural changes may need consent
- Recommend pre-application consultation with planning authority`;
    }
    
    const pdOpportunities = [
      'Single-storey rear extension up to 6m (detached) or 4m (other houses)',
      'Two-storey side return extension (subject to neighbor consultation)',
      'Loft conversion with rear dormer windows',
      'Outbuildings up to 2.5m high (subject to size limits)'
    ];
    
    return `**Standard Permitted Development Rights Available:**
${pdOpportunities.map(op => `- ${op}`).join('\n')}

*Note: All PD rights subject to specific criteria and may require prior approval for certain aspects.*`;
  }

  private identifyDevelopmentOpportunities(data: PropertyData): string {
    const opportunities = [];
    
    if (data.bedrooms && data.bedrooms >= 4) {
      opportunities.push('**HMO Conversion:** Property suitable for House in Multiple Occupation (subject to planning and licensing)');
    }
    
    if (!data.conservationArea) {
      opportunities.push('**Rear Extension:** Single or two-storey extension under PD rights');
      opportunities.push('**Loft Conversion:** Additional bedroom/bathroom space');
    }
    
    if (data.propertyType.toLowerCase().includes('terraced')) {
      opportunities.push('**Side Return Extension:** Maximize ground floor living space');
    }
    
    if (data.useClass === 'C3' && this.estimateFloorArea(data) > 100) {
      opportunities.push('**Flat Conversion:** Potential for self-contained unit creation');
    }

    if (data.bedrooms && data.bedrooms >= 3) {
      opportunities.push('**Modernization:** Kitchen/bathroom upgrades for rental or resale premium');
    }
    
    return opportunities.length > 0 ? opportunities.join('\n') + '\n' : 'Limited development opportunities identified based on current analysis';
  }

  private calculateTransportScore(transportLinks: any[]): number {
    if (transportLinks.length === 0) return 3;
    
    let score = 0;
    const hasRail = transportLinks.some(t => t.type === 'Rail' && t.distance < 1);
    const hasUnderground = transportLinks.some(t => t.type === 'Underground' && t.distance < 0.8);
    const hasBus = transportLinks.some(t => t.type === 'Bus' && t.distance < 0.5);
    
    if (hasUnderground) score += 4;
    if (hasRail) score += 3;
    if (hasBus) score += 2;
    
    if (transportLinks.length > 3) score += 1;
    
    return Math.min(10, score);
  }

  private categorizeAmenities(amenities: any[]): string {
    if (amenities.length === 0) {
      return '**Limited amenity data available** - Recommend site visit to assess local facilities';
    }

    const categories = {
      'Education': amenities.filter(a => a.type === 'school'),
      'Healthcare': amenities.filter(a => a.type === 'hospital'),
      'Shopping': amenities.filter(a => a.type === 'supermarket'),
      'Recreation': amenities.filter(a => a.type === 'park' || a.type === 'gym'),
      'Dining': amenities.filter(a => a.type === 'restaurant')
    };
    
    let result = '';
    for (const [category, items] of Object.entries(categories)) {
      if (items.length > 0) {
        result += `**${category}:**\n`;
        result += items.slice(0, 3).map(item => 
          `- ${item.name} (${item.distance.toFixed(1)}km${item.rating ? `, ${item.rating}⭐` : ''})`
        ).join('\n') + '\n\n';
      }
    }
    
    return result || 'No specific amenity data available';
  }

  private assessInvestmentClimate(data: PropertyData): string {
    const climate = [];
    
    if (data.marketTrends.priceChange1Year > 5) {
      climate.push('**Positive:** Strong recent price growth indicates healthy market demand');
    } else if (data.marketTrends.priceChange1Year < 0) {
      climate.push('**Caution:** Recent price decline may indicate market cooling');
    }
    
    if (data.marketTrends.timeOnMarket < 40) {
      climate.push('**Positive:** Quick sales indicate strong buyer demand');
    }
    
    if (data.transportLinks.length > 2) {
      climate.push('**Positive:** Good transport connectivity supports property values');
    }
    
    return climate.join('\n') || 'Neutral investment climate based on available data';
  }

  private generateInvestmentRationale(data: PropertyData, scenarios: any): string {
    const rationale = [];
    
    if (scenarios.recommended.roi > 25) {
      rationale.push('**Strong ROI Potential:** Returns significantly exceed target threshold');
    }
    
    if (data.transportLinks.length > 2) {
      rationale.push('**Location Advantage:** Multiple transport options support rental/resale demand');
    }
    
    if (data.marketTrends.priceChange1Year > 3) {
      rationale.push('**Market Growth:** Positive local price trends support value appreciation');
    }
    
    if (!data.conservationArea && !data.listedBuilding) {
      rationale.push('**Development Flexibility:** No major planning restrictions limiting options');
    }

    if (data.dataQuality.overallScore > 70) {
      rationale.push('**Data Confidence:** High-quality analysis based on comprehensive data');
    }
    
    return rationale.length > 0 ? rationale.join('\n') : 'Standard investment opportunity with typical market risks';
  }

  private identifyMajorRisks(data: PropertyData): string {
    const risks = [];
    
    if (data.conservationArea || data.listedBuilding) {
      risks.push('**Planning Restrictions:** May limit development options and increase costs');
    }
    
    if (data.marketTrends.demandLevel === 'Low') {
      risks.push('**Market Demand:** Low local demand may affect sale timeline and pricing');
    }
    
    if (data.comparables.length < 3) {
      risks.push('**Valuation Uncertainty:** Limited sales data increases pricing risk');
    }

    if (data.dataQuality.overallScore < 60) {
      risks.push('**Data Quality:** Limited information may affect accuracy of analysis');
    }
    
    return risks.length > 0 ? risks.map(r => `- ${r}`).join('\n') : '- No major risks identified';
  }

  private getStrategyJustification(scenario: DevelopmentScenario, _allScenarios: any): string {
    if (scenario.roi > 25) {
      return 'Highest ROI potential with acceptable risk profile makes this the optimal strategy.';
    } else if (scenario.strategy.includes('Light')) {
      return 'Lower risk approach with shorter timeline reduces market exposure while maintaining good margins.';
    } else {
      return 'Higher value creation through development justifies increased complexity and timeline.';
    }
  }

  private getOverallAssessment(data: PropertyData, scenarios: any): string {
    if (scenarios.recommended.roi > 25 && data.dataQuality.overallScore > 70) {
      return 'Excellent investment opportunity with strong fundamentals';
    } else if (scenarios.recommended.roi > 20) {
      return 'Good investment opportunity meeting target criteria';
    } else if (scenarios.recommended.roi > 15) {
      return 'Marginal investment requiring careful consideration';
    } else {
      return 'Below-target returns suggest seeking alternative opportunities';
    }
  }

  private generateSuccessFactors(data: PropertyData, scenarios: any): string {
    const factors = [
      'Acquire property at or below maximum recommended price',
      'Maintain development costs within budget (include 10% contingency)',
      'Complete development within projected timeline',
      'Market property effectively to achieve target GDV'
    ];

    if (data.conservationArea || data.listedBuilding) {
      factors.push('Secure all required planning permissions before commencement');
    }

    if (scenarios.recommended.timeline.includes('12')) {
      factors.push('Manage extended development timeline and holding costs');
    }

    return factors.map(f => `- ${f}`).join('\n');
  }

  private getInvestmentGrade(scenario: DevelopmentScenario): string {
    if (scenario.roi > 30) return 'A+ (Excellent)';
    if (scenario.roi > 25) return 'A (Very Good)';
    if (scenario.roi > 20) return 'B+ (Good)';
    if (scenario.roi > 15) return 'B (Fair)';
    if (scenario.roi > 10) return 'C (Below Target)';
    return 'D (Poor)';
  }

  private getRiskLevel(data: PropertyData, scenario: DevelopmentScenario): string {
    let riskScore = 0;
    
    if (data.conservationArea || data.listedBuilding) riskScore += 2;
    if (data.marketTrends.demandLevel === 'Low') riskScore += 2;
    if (data.comparables.length < 3) riskScore += 1;
    if (scenario.timeline.includes('12')) riskScore += 1;
    if (data.dataQuality.overallScore < 60) riskScore += 1;
    
    if (riskScore >= 5) return 'High';
    if (riskScore >= 3) return 'Medium';
    return 'Low';
  }

  private getMarketTiming(data: PropertyData): string {
    if (data.marketTrends.priceChange1Year > 8) {
      return 'Good - Strong market growth';
    } else if (data.marketTrends.priceChange1Year > 3) {
      return 'Fair - Moderate growth';
    } else if (data.marketTrends.priceChange1Year > 0) {
      return 'Neutral - Slow growth';
    } else {
      return 'Caution - Declining market';
    }
  }

  private generatePlanningConstraints(data: PropertyData): string {
    const constraints = [];
    
    if (data.conservationArea) {
      constraints.push('**Conservation Area:** Enhanced planning controls apply to preserve character');
    }
    
    if (data.listedBuilding) {
      constraints.push('**Listed Building:** Special consent required for alterations affecting historic character');
    }
    
    if (data.article4Direction) {
      constraints.push('**Article 4 Direction:** Permitted development rights withdrawn in this area');
    }
    
    constraints.push('**Building Regulations:** All structural work must comply with current standards');
    constraints.push('**Party Wall Act:** May apply for extensions affecting neighboring properties');
    
    return constraints.join('\n');
  }
}