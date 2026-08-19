import { describe, expect, it } from "vitest";
import { parseBankMessage } from "../../app/bankParser";
import { fromMajor } from "../../money";

describe("parseBankMessage — Kuwaiti bank SMS/notification formats", () => {
  it("parses an NBK-style POS purchase with balance", () => {
    const p = parseBankMessage(
      "Purchase of KD 12.500 at STARBUCKS KUWAIT on 19/08/2026 using card ending 1234. Available balance KD 718.230",
    )!;
    expect(p.direction).toBe("debit");
    expect(p.amountMinor).toBe(fromMajor(12.5));
    expect(p.merchant).toBe("STARBUCKS KUWAIT");
    expect(p.category).toBe("Dining");
    expect(p.balanceMinor).toBe(fromMajor(718.23));
    expect(p.confidence).toBe("high");
  });

  it("parses a debited-account message", () => {
    const p = parseBankMessage("KD 4.750 was debited from your account for payment at %ARABICA")!;
    expect(p.direction).toBe("debit");
    expect(p.amountMinor).toBe(fromMajor(4.75));
    expect(p.category).toBe("Dining");
  });

  it("parses a salary credit with thousands separator", () => {
    const p = parseBankMessage("Your account has been credited with KWD 1,200.000 SALARY ALGHANIM")!;
    expect(p.direction).toBe("credit");
    expect(p.amountMinor).toBe(fromMajor(1200));
    expect(p.category).toBe("Income");
    expect(p.confidence).toBe("high");
  });

  it("parses amount-first format and ATM withdrawals", () => {
    const p = parseBankMessage("ATM withdrawal 100.000 KD from your account. Balance 530.100 KD")!;
    expect(p.direction).toBe("debit");
    expect(p.amountMinor).toBe(fromMajor(100));
    expect(p.category).toBe("Cash");
    expect(p.balanceMinor).toBe(fromMajor(530.1));
  });

  it("categorizes groceries and fuel merchants", () => {
    expect(parseBankMessage("Purchase of KD 27.324 at LULU HYPERMARKET using card 5678")!.category).toBe("Groceries");
    expect(parseBankMessage("POS purchase KD 8.000 at KNPC STATION 12")!.category).toBe("Transport");
  });

  it("parses Arabic debit and credit messages", () => {
    const debit = parseBankMessage("تم خصم د.ك 12.500 من حسابك لدى ستاربكس الكويت")!;
    expect(debit.direction).toBe("debit");
    expect(debit.amountMinor).toBe(fromMajor(12.5));
    expect(debit.merchant).toContain("ستاربكس");
    const credit = parseBankMessage("تم إيداع د.ك 1,200.000 في حسابك - راتب")!;
    expect(credit.direction).toBe("credit");
    expect(credit.amountMinor).toBe(fromMajor(1200));
  });

  it("no directional keyword → assumed debit with LOW confidence, honestly labeled", () => {
    const p = parseBankMessage("KD 5.000 CARIBOU COFFEE 19/08")!;
    expect(p.direction).toBe("debit");
    expect(p.confidence).toBe("low");
    expect(p.signal).toMatch(/assumed/);
  });

  it("both keywords present → text order wins with medium confidence", () => {
    const p = parseBankMessage("KD 50.000 debited from your account and credited to beneficiary AHMAD")!;
    expect(p.direction).toBe("debit");
    expect(p.confidence).toBe("medium");
  });

  it("returns null when no amount exists — never invents a transaction", () => {
    expect(parseBankMessage("Your OTP code is 482913. Do not share it.")).toBeNull();
    expect(parseBankMessage("")).toBeNull();
    expect(parseBankMessage("Welcome to NBK mobile banking")).toBeNull();
  });

  it("handles 1–3 decimal places (KWD fils precision)", () => {
    expect(parseBankMessage("Purchase of KD 3.5 at COSTA")!.amountMinor).toBe(fromMajor(3.5));
    expect(parseBankMessage("Purchase of KD 3.75 at COSTA")!.amountMinor).toBe(fromMajor(3.75));
    expect(parseBankMessage("Purchase of KD 3.755 at COSTA")!.amountMinor).toBe(fromMajor(3.755));
  });
});
