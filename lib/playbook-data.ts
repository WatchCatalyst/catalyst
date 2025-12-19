import type { MarketTopic } from "./market-relevance-classifier"

export type PlaybookContent = {
  definition: string
  patterns: string[]
}

export const PLAYBOOK_CONTENT: Record<MarketTopic | "DEFAULT", PlaybookContent> = {
  RATES_CENTRAL_BANKS: {
    definition:
      "Decisions on interest rates and monetary policy by major central banks (Fed, ECB, BOJ, BOE). These decisions affect liquidity, risk appetite, and asset valuations across global markets.",
    patterns: [
      "Hawkish surprise (Rate Hike/High Inflation) → Bearish for Stocks/Crypto, Bullish for Currency.",
      "Dovish surprise (Rate Cut/Low Inflation) → Bullish for Risk Assets (Stocks, Crypto).",
      "Watch for 'Fed Pivot' language in minutes - markets often react more to forward guidance than the rate change itself.",
      "Initial reaction in first 5-15 minutes can be violent and sometimes reverses - wait for the first 30-minute range to break.",
    ],
  },
  INFLATION_MACRO: {
    definition:
      "Economic data releases like CPI, GDP, jobs reports, PMI that signal the health of the economy and influence central bank policy expectations.",
    patterns: [
      "Higher-than-expected inflation → Bearish for stocks/bonds, Bullish for dollar and commodities.",
      "Lower-than-expected inflation → Bullish for risk assets, potential rate cut expectations rise.",
      "Pre-market positioning often leads to sharp reversals after the data drops - be careful of fakeouts.",
      "Watch bond yields and dollar strength for confirmation of the macro narrative.",
    ],
  },
  REGULATION_POLICY: {
    definition:
      "SEC actions, bans, tax policy, new laws affecting markets. These can change how entire sectors or asset classes are valued, especially crypto, financials, and energy.",
    patterns: [
      "Major regulatory actions can reprice entire sectors or asset classes, not just one ticker.",
      "First headlines can be messy; details released later may confirm or soften the impact.",
      "Check if the regulation has immediate effect or requires further approval/implementation - delays can reduce impact.",
      "Crypto regulations often trigger sector-wide moves - watch BTC dominance for broader sentiment.",
    ],
  },
  EARNINGS_FINANCIALS: {
    definition:
      "Quarterly earnings reports, guidance, revenue announcements. Surprises in these can quickly reprice stocks and affect related names in the sector.",
    patterns: [
      "Earnings beats often gap up on open; watch whether price defends or fills that gap in first hour.",
      "Guidance and commentary can matter more than the headline EPS number - forward-looking statements drive price.",
      "Volume staying elevated after the open can signal potential trend days vs. quick reversals.",
      "Sector peers often move in sympathy - check related tickers and sector ETFs for confirmation.",
    ],
  },
  MA_CORPORATE_ACTIONS: {
    definition:
      "Mergers, acquisitions, stock splits, buybacks, token burns, IPOs. These create immediate arbitrage opportunities or sector rotation.",
    patterns: [
      "Target companies often gap toward the offer price; acquirers may sell off on dilution concerns.",
      "Watch for competing bids or regulatory pushback that can extend timelines and create volatility.",
      "Sector peers may move in sympathy if the deal signals broader consolidation in the industry.",
      "Stock buybacks and token burns can create sustained upward pressure if volume is significant.",
    ],
  },
  TECH_PRODUCT: {
    definition:
      "AI initiatives, L2 mainnets, new chips, protocol upgrades, major product launches. Adoption, performance, and user reaction can change how tokens or companies are valued.",
    patterns: [
      "'Buy the rumor, sell the news' behavior is common around launch dates - watch for initial selloffs on launch.",
      "Watch whether on-chain/user activity actually picks up after the announcement - adoption metrics matter more than hype.",
      "Technical issues or delays on launch day can trigger sharp selloffs - have stops ready.",
      "Major tech product launches can drive sector rotation - watch related suppliers and competitors.",
    ],
  },
  SECURITY_INCIDENT: {
    definition:
      "Hacks, exploits, outages, smart contract bugs, data breaches. These often hit confidence in the company or protocol and can trigger sharp repricing.",
    patterns: [
      "Initial selloff can be sharp; watch for follow-up news on scope, losses, or fixes before buying the dip.",
      "Repeat incidents or poor communication can lead to longer-lasting damage - avoid catching falling knives.",
      "Recovery announcements or insurance payouts can stabilize price action - wait for confirmation.",
      "Security incidents in DeFi protocols can trigger sector-wide de-risking - check correlation across crypto.",
    ],
  },
  ETFS_FLOWS: {
    definition:
      "ETF approvals, fund launches, major institutional flows, treasury buys, whale movements. Institutional money moving in or out can create sustained trends.",
    patterns: [
      "ETF approval rumors often cause volatility; actual approval can be a 'sell the news' event after initial pop.",
      "Large inflows/outflows can show institutional sentiment shifts - track flows over multiple days for trends.",
      "Watch for arbitrage opportunities between ETF price and underlying assets during high volatility.",
      "Whale movements (large holder transactions) can signal major position changes - follow the smart money.",
    ],
  },
  LEGAL_ENFORCEMENT: {
    definition:
      "Lawsuits, DOJ/SEC enforcement actions, settlements, investigations, large fines. These can create uncertainty and pressure stock prices until resolved.",
    patterns: [
      "Settlement announcements can remove overhang and spark relief rallies - often good entry points.",
      "Ongoing litigation can cap upside as investors wait for clarity - avoid stocks with major unresolved legal issues.",
      "Large fines or penalties can trigger selloffs if they materially impact financials - check the actual impact vs. market cap.",
      "DOJ/SEC enforcement actions against companies can trigger sector-wide regulatory concerns - check peer impact.",
    ],
  },
  GEOPOLITICS_CRISIS: {
    definition:
      "Wars, sanctions, supply shocks, pandemics, trade tensions. These affect risk sentiment, commodities, and safe-haven assets globally.",
    patterns: [
      "Can drive flows into or out of safe-haven assets (USD, bonds, gold, sometimes BTC) - watch currency pairs.",
      "Sector impact depends on commodities, supply chains, or sanctions involved - defense stocks and energy often rise on escalation.",
      "Initial panic often fades as markets assess actual business impact vs. headline risk - be careful of overreacting.",
      "Supply chain disruptions can create commodity price spikes - watch oil, gold, and agricultural futures.",
    ],
  },
  DEFAULT: {
    definition:
      "This headline is tagged as a potential market catalyst. The event type determines its likely market impact.",
    patterns: [
      "Look for whether the first move holds or fades through the first hour of trading.",
      "Check related tickers or sector ETFs for confirmation of the narrative.",
      "Volume profile matters: strong volume confirms conviction, low volume suggests uncertainty or noise.",
    ],
  },
}

