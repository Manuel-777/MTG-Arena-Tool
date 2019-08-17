const math = require("mathjs");

math.config({ precision: 2000 });

//
function hypergeometric(
  exact,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  return hypergeometricRange(
    exact,
    exact,
    population,
    sample,
    hitsInPop,
    returnBig
  );
}

//
exports.hypergeometricRange = hypergeometricRange;
function hypergeometricRange(
  lowerBound,
  upperBound,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  if (lowerBound > upperBound || lowerBound > hitsInPop) {
    return returnBig ? math.bignumber(0) : 0;
  }

  let _population = math.bignumber(population);
  let _sample = math.bignumber(sample);
  let _hitsInPop = math.bignumber(hitsInPop);
  let matchingCombos = math.bignumber(0);
  // Can't have more non-hits in the sample than exist in the population
  for (
    let i = math.max(lowerBound, sample - (population - hitsInPop));
    i <= upperBound && i <= sample;
    i++
  ) {
    let _hitsInSample = math.bignumber(i);
    let _hitCombos = math.combinations(_hitsInPop, _hitsInSample);
    let _missCombos = math.combinations(
      math.max(0, math.subtract(_population, _hitsInPop)),
      math.max(0, math.subtract(_sample, _hitsInSample))
    );
    matchingCombos = math.add(
      matchingCombos,
      math.multiply(_hitCombos, _missCombos)
    );
  }

  let totalCombos = math.combinations(_population, _sample);
  let probability = math.divide(matchingCombos, totalCombos);
  return returnBig ? probability : math.number(probability);
}

// This function is designed to assess the "significance" of a particular result by calculating an alternative to
// percentile designed to measure deviation from median in both directions the same way and ensure the average returned
// value (assuming true random) is always 50%. This is done by treating the given result as a range of values
// distributed evenly throughout the percentile range covered by the result. For example, a result of 0 that has a 20%
// chance of happening is treated as a composite distributed evenly by percentile through the 0% to 20% percentile
// range. The returned value is the probability that a result is at least as far from median as the given value. Return
// values close to 1 indicate the passed in value was very close to average, return values close to 0 indicate it was
// very far from average.
exports.hypergeometricSignificance = hypergeometricSignificance;
function hypergeometricSignificance(
  value,
  population,
  sample,
  hitsInPop,
  returnBig = false
) {
  let percentile = hypergeometricRange(
    0,
    value,
    population,
    sample,
    hitsInPop,
    true
  );
  let chance = hypergeometric(value, population, sample, hitsInPop, true);
  if (math.smallerEq(percentile, 0.5)) {
    let midpoint = math.subtract(percentile, math.divide(chance, 2));
    let retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal);
  }
  let reversePercentile = hypergeometricRange(
    value,
    math.min(hitsInPop, sample),
    population,
    sample,
    hitsInPop,
    true
  );
  if (math.smallerEq(reversePercentile, 0.5)) {
    let midpoint = math.subtract(reversePercentile, math.divide(chance, 2));
    let retVal = math.multiply(midpoint, 2);
    return returnBig ? retVal : math.number(retVal);
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
  let centeredSize = math.multiply(math.subtract(smaller, 0.5), 2);
  let otherSize = math.subtract(larger, smaller);
  let centeredAverage = math.divide(centeredSize, 4); // half for being centered, half again for average
  // Average of the farther bound (otherSize + centeredSize/2) and the closer bound (centeredSize/2). Works out to
  // ((otherSize + centeredSize/2) + (centeredSize/2)) / 2, simplified to (otherSize + centeredSize) / 2.
  let otherAverage = math.divide(math.add(centeredSize, otherSize), 2);
  let weightedAverage = math.divide(
    math.add(
      math.multiply(centeredSize, centeredAverage),
      math.multiply(otherSize, otherAverage)
    ),
    chance
  );
  let retVal = math.subtract(1, math.multiply(weightedAverage, 2));
  return returnBig ? retVal : math.number(retVal);
}

// Computes the Wald Interval aka Normal Approximation Interval
// Useful for quickly estimating the 95% confidence interval
// Can produce bad results when sample-size < 20
// https://en.wikipedia.org/wiki/Binomial_proportion_confidence_interval#Normal_approximation_interval
// https://www.channelfireball.com/articles/magic-math-how-many-games-do-you-need-for-statistical-significance-in-playtesting/
exports.normalApproximationInterval = normalApproximationInterval;
function normalApproximationInterval(matches, wins) {
  if (!matches) return { winrate: 0, interval: 0 };
  const winrate = wins / matches;
  const interval = 1.96 * Math.sqrt((winrate * (1 - winrate)) / matches);
  return { winrate, interval };
}
