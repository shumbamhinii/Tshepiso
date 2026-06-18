import { PricingSetup, PricingProduct, PricingResults, CalculatedProduct } from '@/types/pricing';

export const calculatePricing = (setup: PricingSetup, products: PricingProduct[]): PricingResults => {
  const {
    totalCost, useBreakdown, expenses, useMargin, targetProfit, targetMargin,
    pmFeePercent, urgency, sustainabilityPremium, sustainabilityPremiumPct,
  } = setup;

  // Surcharge multipliers from Tshepiso framework
  const rushSurchargeMap: Record<string, number> = { standard: 0, "48h": 15, "24h": 25, "same-day": 40 };
  const rushSurcharge    = (rushSurchargeMap[urgency ?? "standard"] ?? 0) / 100;
  const pmMultiplier     = (pmFeePercent ?? 0) / 100;
  const esgMultiplier    = sustainabilityPremium ? (sustainabilityPremiumPct ?? 0) / 100 : 0;
  // Combined uplift on top of base selling price
  const priceUplift = 1 + rushSurcharge + pmMultiplier + esgMultiplier;
  
  const actualFixedCost = useBreakdown 
    ? expenses.reduce((sum, exp) => sum + exp.amount, 0)
    : totalCost;

  const marginDecimal = targetMargin / 100;
  const totalVariableCost = products.reduce((sum, p) => {
    const cost = p.costPerUnit || 0;
    const units = p.expectedUnits || 0;
    return sum + cost * units;
  }, 0);

  const totalRevenueValue = useMargin
    ? (actualFixedCost + totalVariableCost) / (1 - marginDecimal)
    : (actualFixedCost + totalVariableCost) + targetProfit;

  const calculatedProfit = totalRevenueValue - actualFixedCost - totalVariableCost;

  const percentageBasedProducts = products.filter(p => p.calculationMethod === 'percentage');
  const costPlusBasedProducts = products.filter(p => p.calculationMethod === 'cost-plus');

  const totalVariableCostForCostPlus = costPlusBasedProducts.reduce((sum, p) => {
    const cost = p.costPerUnit || 0;
    const units = p.expectedUnits || 0;
    return sum + cost * units;
  }, 0);

  const fixedCostAllocatedToPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
    const productExpectedRevenue = (p.revenuePercentage || 0) / 100 * totalRevenueValue;
    return sum + ((productExpectedRevenue / totalRevenueValue) * actualFixedCost);
  }, 0);

  const fixedCostAllocatedToCostPlusProducts = actualFixedCost - fixedCostAllocatedToPercentageProducts;

  const profitFromPercentageProducts = percentageBasedProducts.reduce((sum, p) => {
    const productExpectedRevenue = (p.revenuePercentage || 0) / 100 * totalRevenueValue;
    const productVariableCost = (p.costPerUnit || 0) * (p.expectedUnits || 0);
    const productAllocatedFixedCost = ((productExpectedRevenue / totalRevenueValue) * actualFixedCost);
    return sum + (productExpectedRevenue - productVariableCost - productAllocatedFixedCost);
  }, 0);

  const profitNeededFromCostPlusProducts = calculatedProfit - profitFromPercentageProducts;

  const calculatedProducts: CalculatedProduct[] = products.map((product) => {
    const safeExpectedUnits = Math.max(product.expectedUnits || 0, 1);
    const safeCostPerUnit = product.costPerUnit || 0;
    const calculationMethod = product.calculationMethod || 'cost-plus';

    let suggestedPrice = 0;
    let percentageRevenue = 0;
    let suggestedProfitPerUnit = 0;
    let totalRevenue = 0;
    let profitPerUnit = 0;

    if (calculationMethod === 'percentage') {
      const safeRevenuePercentage = (product.revenuePercentage || 0) / 100;
      const revenueShare = safeRevenuePercentage * totalRevenueValue;
      suggestedPrice = revenueShare / safeExpectedUnits;
      suggestedPrice = Math.round(suggestedPrice * priceUplift * 100) / 100;

      const productRevenue = suggestedPrice * safeExpectedUnits;
      const productVariableCost = safeCostPerUnit * safeExpectedUnits;
      const productAllocatedFixedCost = (productRevenue / (totalRevenueValue * priceUplift)) * actualFixedCost;
      const productProfit = productRevenue - productVariableCost - productAllocatedFixedCost;

      totalRevenue = productRevenue;
      percentageRevenue = productRevenue > 0 ? (productProfit / productRevenue) * 100 : 0;
      suggestedProfitPerUnit = productProfit / safeExpectedUnits;
      profitPerUnit = suggestedProfitPerUnit;
    } else {
      const productVariableCost = safeCostPerUnit * safeExpectedUnits;
      const productCostShare = totalVariableCostForCostPlus > 0 ? (productVariableCost / totalVariableCostForCostPlus) : 0;

      const productFixedCostShare = productCostShare * fixedCostAllocatedToCostPlusProducts;
      const productProfitShare = productCostShare * profitNeededFromCostPlusProducts;

      const fixedCostPerUnit = productFixedCostShare / safeExpectedUnits;
      const profitPerUnitCalc = productProfitShare / safeExpectedUnits;

      suggestedProfitPerUnit = fixedCostPerUnit + profitPerUnitCalc;
      // Apply PM fee + rush + ESG uplift on top of base selling price
      suggestedPrice = (safeCostPerUnit + fixedCostPerUnit + profitPerUnitCalc) * priceUplift;
      suggestedPrice = Math.round(suggestedPrice * 100) / 100;

      const productRevenue = suggestedPrice * safeExpectedUnits;
      const productTotalCost = (safeCostPerUnit * safeExpectedUnits) + productFixedCostShare;

      totalRevenue = productRevenue;
      percentageRevenue = productRevenue > 0 ? ((productRevenue - productTotalCost) / productRevenue) * 100 : 0;
      profitPerUnit = suggestedPrice - safeCostPerUnit;
    }

    return {
      ...product,
      price: suggestedPrice,
      unitsNeeded: calculationMethod === 'percentage'
        ? (suggestedPrice > 0 ? Math.ceil((product.revenuePercentage || 0) / 100 * totalRevenueValue / suggestedPrice) : 0)
        : product.expectedUnits || 0,
      percentageRevenue,
      suggestedProfit: suggestedProfitPerUnit,
      totalRevenue,
      profitPerUnit,
      profitMargin: percentageRevenue,
    };
  });

  const actualTotalRevenue = calculatedProducts.reduce((sum, product) => {
    return sum + product.totalRevenue;
  }, 0);

  return {
    actualCost: actualFixedCost,
    totalRevenue: totalRevenueValue,
    calculatedProfit,
    actualTotalRevenue,
    calculatedProducts,
    inputs: { ...setup, products }
  };
};
