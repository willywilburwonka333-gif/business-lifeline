import type { SavedReport } from "./saved-report";

export type IndustryModule = {
  id: "hospitality" | "construction" | "retail" | "service" | "petrol" | "general";
  name: string;
  kpis: string[];
  diagnosticQuestions: string[];
  watchPoints: string[];
  actions: string[];
};

export function industryModule(saved: SavedReport): IndustryModule {
  const industry = saved.data.industry.toLowerCase();
  const margin = saved.report.metrics.operatingMargin;
  const receivablesRatio = saved.data.monthlyRevenue > 0 ? saved.data.accountsReceivable / saved.data.monthlyRevenue : 0;

  if (/cafe|café|restaurant|hospitality|food|bar|hotel/.test(industry)) {
    return {
      id: "hospitality",
      name: "Hospitality",
      kpis: ["Labour % of sales", "Food/beverage cost %", "Gross margin by item", "Average transaction value", "Waste/voids", "Sales by daypart"],
      diagnosticQuestions: ["Which shifts or dayparts lose money?", "Which menu items create contribution after labour and delivery fees?", "How much stock is wasted weekly?", "Are delivery-platform sales actually profitable?"],
      watchPoints: [
        margin < 8 ? "Current operating margin is thin for volatility in labour, food and energy costs." : "Protect contribution margin as sales mix changes.",
        "Average monthly numbers can hide unprofitable shifts and dayparts.",
        "Inventory shrinkage and waste should be measured separately from normal cost of sales.",
      ],
      actions: ["Rank menu/products by contribution, not popularity alone.", "Measure labour and food cost weekly.", "Reprice or remove structurally low-margin items.", "Match roster hours to demand by daypart."],
    };
  }

  if (/construction|trad|building|plumb|electric|carpentry|landscap|contractor/.test(industry)) {
    return {
      id: "construction",
      name: "Construction & trades",
      kpis: ["Gross margin by job", "WIP", "Variation recovery", "Debtor days", "Labour utilisation", "Committed material cost"],
      diagnosticQuestions: ["Which current jobs are over budget?", "Are variations approved before work continues?", "How much completed work is unbilled?", "What percentage of receivables is retention or disputed?"],
      watchPoints: [
        receivablesRatio > 1 ? "Receivables exceed one month of revenue; progress-claim timing and collection need attention." : "Keep progress claims aligned with cash outflows.",
        "Revenue can look strong while individual jobs destroy margin.",
        "Fixed-price jobs need contingency for labour/material volatility.",
      ],
      actions: ["Reforecast every active job to completion.", "Invoice approved milestones immediately.", "Separate variations from base contract margin.", "Stop quoting work below true labour/material/overhead cost."],
    };
  }

  if (/petrol|fuel|service station|convenience/.test(industry)) {
    return {
      id: "petrol",
      name: "Petrol & convenience",
      kpis: ["Fuel margin cents/litre", "Shop gross margin", "Stock shrinkage", "Wet-stock variance", "Card/merchant fees", "Sales mix"],
      diagnosticQuestions: ["What is fuel contribution after freight/fees?", "Which shop categories generate the strongest gross profit?", "Are wet-stock losses within expected tolerance?", "How much working capital is tied up in fuel and inventory?"],
      watchPoints: ["High revenue can mask very thin fuel margins.", "Working-capital timing can create pressure even when volume is strong.", "Stock/shrinkage and merchant fees should be monitored separately."],
      actions: ["Track fuel and shop contribution separately.", "Review high-margin convenience mix.", "Reconcile stock and wet-stock variances frequently.", "Model supplier/payment timing in the 13-week forecast."],
    };
  }

  if (/retail|shop|store|ecommerce|e-commerce/.test(industry)) {
    return {
      id: "retail",
      name: "Retail",
      kpis: ["Gross margin by SKU/category", "Stock turn", "Sell-through", "Average order value", "Repeat purchase rate", "Markdown %"],
      diagnosticQuestions: ["Which stock is tying up cash?", "Which products sell but contribute little margin?", "How much revenue depends on discounting?", "Which customer segments repeat most profitably?"],
      watchPoints: ["Inventory can make accounting profit look stronger than available cash.", "Slow stock and discount dependency should be treated as cash-flow risks.", "Freight, marketplace and payment fees belong in true product margin."],
      actions: ["Rank stock by cash contribution and days held.", "Stop/reduce reordering slow movers.", "Test bundles and price architecture before broad discounting.", "Track repeat rate and customer acquisition payback."],
    };
  }

  if (/service|consult|agency|professional|clean|garden|maintenance|software/.test(industry)) {
    return {
      id: "service",
      name: "Service business",
      kpis: ["Billable utilisation", "Gross margin by service/client", "Recurring revenue", "Client concentration", "Pipeline conversion", "Revenue per labour hour"],
      diagnosticQuestions: ["Which clients consume disproportionate time?", "What work can be standardised or delegated?", "How much revenue recurs without reselling?", "What is effective hourly contribution after non-billable time?"],
      watchPoints: ["Owner dependence can cap growth and reduce sale value.", "Revenue can increase while utilisation or delivery margin deteriorates.", "Client concentration should be monitored alongside pipeline quality."],
      actions: ["Measure contribution by client/service.", "Productise repeatable delivery.", "Reduce owner-only tasks.", "Build recurring or contracted revenue where appropriate."],
    };
  }

  return {
    id: "general",
    name: "General small business",
    kpis: ["Gross margin", "Cash conversion", "Customer concentration", "Revenue per employee", "Receivable days", "Recurring/repeat revenue"],
    diagnosticQuestions: ["Which customers/products generate real cash contribution?", "What limits additional profitable sales?", "Which costs rise fastest with volume?", "What depends too heavily on the owner?"],
    watchPoints: ["Revenue alone is not a health measure.", "Cash timing, margin and concentration should be reviewed together.", "Growth should not outrun operating capacity."],
    actions: ["Rank customers/products by contribution.", "Track cash conversion and overdue receivables.", "Document owner-dependent processes.", "Test growth decisions with scenario economics first."],
  };
}
