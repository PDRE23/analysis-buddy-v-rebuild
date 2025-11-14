"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { NERYear } from "@/lib/types/ner";

interface NERYearlyBreakdownProps {
  breakdown: NERYear[];
  calculations?: {
    total: number;
    average: number;
    npv: number;
    pmt: number;
  };
}

export function NERYearlyBreakdown({ breakdown, calculations }: NERYearlyBreakdownProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Year-by-Year Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2 font-semibold">Year</th>
                <th className="text-right p-2 font-semibold">Base</th>
                <th className="text-right p-2 font-semibold">Free</th>
                <th className="text-right p-2 font-semibold">TI</th>
                <th className="text-right p-2 font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.map((year) => (
                <tr key={year.year} className="border-b hover:bg-gray-50">
                  <td className="p-2">{year.year}</td>
                  <td className="text-right p-2">{formatCurrency(year.baseRent)}</td>
                  <td className="text-right p-2 text-red-600">
                    {formatCurrency(year.freeRent)}
                  </td>
                  <td className="text-right p-2 text-red-600">
                    {formatCurrency(year.ti)}
                  </td>
                  <td className="text-right p-2 font-semibold">
                    {formatCurrency(year.total)}
                  </td>
                </tr>
              ))}
            </tbody>
            {calculations && (
              <tfoot>
                <tr className="border-t-2 font-semibold bg-gray-50">
                  <td className="p-2">Total</td>
                  <td className="text-right p-2" colSpan={3}>
                    {formatCurrency(calculations.total)}
                  </td>
                  <td className="text-right p-2">{formatCurrency(calculations.total)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2">Average</td>
                  <td className="text-right p-2" colSpan={3}>
                    {formatCurrency(calculations.average)}
                  </td>
                  <td className="text-right p-2">{formatCurrency(calculations.average)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2">NPV</td>
                  <td className="text-right p-2" colSpan={3}>
                    {formatCurrency(calculations.npv)}
                  </td>
                  <td className="text-right p-2">{formatCurrency(calculations.npv)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td className="p-2">PMT</td>
                  <td className="text-right p-2" colSpan={3}>
                    {formatCurrency(calculations.pmt)}
                  </td>
                  <td className="text-right p-2">{formatCurrency(calculations.pmt)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

