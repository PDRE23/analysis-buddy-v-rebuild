import { blendedRate, freeRentValue } from "@/lib/analysis";

describe("effective rent helpers", () => {
  it("computes blended rate from net rent, rsf, term months", () => {
    const totalNetRent = 120000;
    const rsf = 10000;
    const termMonths = 60;
    const expected = totalNetRent / (rsf * (termMonths / 12));
    expect(blendedRate(totalNetRent, rsf, termMonths)).toBe(expected);
  });

  it("returns 0 when rsf or term months are zero", () => {
    expect(blendedRate(10000, 0, 12)).toBe(0);
    expect(blendedRate(10000, 1000, 0)).toBe(0);
  });

  it("sums free rent value from schedule", () => {
    const schedule = {
      months: [
        { free_rent_amount: -1000 },
        { free_rent_amount: 0 },
        { free_rent_amount: -500 },
      ],
    };
    expect(freeRentValue(schedule)).toBe(1500);
  });
});
