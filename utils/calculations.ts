
import { Decimal } from 'decimal.js';
import { UnitConversion } from '../types';

/**
 * Converts quantity from a specific unit to the base unit.
 */
export const toBaseUnit = (quantity: number, factor: number): number => {
  return new Decimal(quantity).mul(factor).toNumber();
};

/**
 * Converts quantity from base unit to a specific unit.
 */
export const fromBaseUnit = (quantity: number, factor: number): number => {
  if (factor === 0) return 0;
  return new Decimal(quantity).div(factor).toNumber();
};

/**
 * Safely sums an array of numbers using Decimal for precision.
 */
export const sumPrecise = (numbers: number[]): number => {
  return numbers.reduce((acc, curr) => acc.plus(curr), new Decimal(0)).toNumber();
};

/**
 * Calculates stock balance from ledger entries.
 */
export const calculateBalance = (entries: { quantity: number, type: string }[]): number => {
  return entries.reduce((acc, entry) => {
    const qty = new Decimal(entry.quantity);
    if (entry.type.includes('IN')) return acc.plus(qty);
    if (entry.type.includes('OUT')) return acc.minus(qty);
    return acc;
  }, new Decimal(0)).toNumber();
};
