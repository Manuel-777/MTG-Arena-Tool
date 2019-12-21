import { create, all, MathJsStatic } from "mathjs";

const config = { precision: 2000 };
const math: MathJsStatic = create(all, config) as MathJsStatic;

function hypergeometric(
  exact: number,
  population: number,
  sample: number,
  hitsInPop: number
): number;
function hypergeometric(
  exact: number,
  population: number,
  sample: number,
  hitsInPop: number,
  returnBig: boolean
): math.MathType;
function hypergeometric(
  exact: number,
  population: number,
  sample: number,
  hitsInPop: number,
  returnBig = false
): math.MathType {
  return hypergeometricRange(
    exact,
    exact,
    population,
    sample,
    hitsInPop,
    returnBig
  );
}

export function hypergeometricRange(
  lowerBound: number,
  upperBound: number,
  population: number,
  sample: number,
  hitsInPop: number
): number;
export function hypergeometricRange(
  lowerBound: number,
  upperBound: number,
  population: number,
  sample: number,
  hitsInPop: number,
  returnBig: boolean
): math.MathType;
export function hypergeometricRange(
  lowerBound: number,
  upperBound: number,
  population: number,
  sample: number,
  hitsInPop: number,
  returnBig = false
): math.MathType {
  if (lowerBound > upperBound || lowerBound > hitsInPop) {
    return returnBig ? math.bignumber(0) : 0;
  }

  const _population = math.bignumber(population);
  const _sample = math.bignumber(sample);
  const _hitsInPop = math.bignumber(hitsInPop);
  let matchingCombos: math.MathType = math.bignumber(0);
  // Can't have more non-hits in the sample than exist in the population
  for (
    let i = math.max(lowerBound, sample - (population - hitsInPop));
    i <= upperBound && i <= sample;
    i++
  ) {
    const _hitsInSample = math.bignumber(i);
    const _hitCombos = math.combinations(_hitsInPop, _hitsInSample);
    const _missCombos = math.combinations(
      math.max(0, math.subtract(_population, _hitsInPop)),
      math.max(0, math.subtract(_sample, _hitsInSample))
    );
    matchingCombos = math.add(
      matchingCombos,
      math.multiply(_hitCombos, _missCombos)
    );
  }

  const totalCombos = math.combinations(_population, _sample);
  const probability = math.divide(matchingCombos, totalCombos);
  return returnBig ? probability : math.number(probability as any);
}

export function hypergeometricSignificance(
  value: number,
  population: number,
  sample: number,
  hitsInPop: number
): number;
export function hypergeometricSignificance(
  value: number,
  population: number,
  sample: number,
  hitsInPop: number,
  returnBig = false
): math.MathType {
  const percentile = hypergeometricRange(
    0,
    value,
    population,
    sample,
    hitsInPop,
    true
  );
  const chance = hypergeometric(value, population, sample, hitsInPop, true);
  if (math.smallerEq(percentile, 0.5)) {
    const midpoint = math.subtract(percentile, math.divide(chance, 2));
    const retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal as any);
  }
  const reversePercentile = hypergeometricRange(
    value,
    math.min(hitsInPop, sample),
    population,
    sample,
    hitsInPop,
    true
  );
  if (math.smallerEq(reversePercentile, 0.5)) {
    const midpoint = math.subtract(reversePercentile, math.divide(chance, 2));
    const retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal as any);
  }
  // If we get here, then value is the median and we need to weight things for how off-center its percentile range is.
  let smaller, larger;
  if (math.smallerEq(percentile, reversePercentile)) {
    smaller = percentile;
    larger = reversePercentile;
  } else {
    smaller = reversePercentile;
    larger = percentile;
  }
  // Divide the range into a symmetric portion centered on .5, and another portion for the rest. Calculate the average
  // distance from center for each, and use the average of that weighted by each portion's size.
  const centeredSize = math.multiply(math.subtract(smaller, 0.5), 2);
  const otherSize = math.subtract(larger, smaller);
  const centeredAverage = math.divide(centeredSize, 4); // half for being centered, half again for average
  // Average of the farther bound (otherSize + centeredSize/2) and the closer bound (centeredSize/2). Works out to
  // ((otherSize + centeredSize/2) + (centeredSize/2)) / 2, simplified to (otherSize + centeredSize) / 2.
  const otherAverage = math.divide(math.add(centeredSize, otherSize), 2);
  const weightedAverage = math.divide(
    math.add(
      math.multiply(centeredSize, centeredAverage),
      math.multiply(otherSize, otherAverage)
    ),
    chance
  );
  const retVal = math.subtract(1, math.multiply(weightedAverage, 2));
  return returnBig ? retVal : math.number(retVal as any);
}

/**
 * Computes the Wald Interval aka Normal Approximation Interval
 * Useful for quickly estimating the 95% confidence interval
 * Can produce bad results when sample-size < 20
 * https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Normal_approximation_interval
 * https://www.channelfireball.com/articles/magic-math-how-many-games-do-you-need-for-statistical-significance-in-playtesting/
 */
export function normalApproximationInterval(
  matches: number,
  wins: number
): { winrate: number; interval: number } {
  if (!matches) return { winrate: 0, interval: 0 };
  const winrate = wins / matches;
  const interval = 1.96 * Math.sqrt((winrate * (1 - winrate)) / matches);
  return { winrate, interval };
}
