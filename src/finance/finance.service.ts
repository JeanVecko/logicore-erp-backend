import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FinanceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(companyId: string) {
    const [kpis, trend, overdueInvoices, topDebtors, recentPayments, invoicesByStatus] = await Promise.all([
      this.getKpis(companyId),
      this.getTrend(companyId),
      this.getOverdueInvoices(companyId),
      this.getTopDebtors(companyId),
      this.getRecentPayments(companyId),
      this.getInvoicesByStatus(companyId),
    ]);
    return { kpis, trend, overdueInvoices, topDebtors, recentPayments, invoicesByStatus };
  }

  private async getKpis(companyId: string) {
    const now = new Date();

    const [validatedSales, invoices] = await Promise.all([
      this.prisma.sale.findMany({ where: { companyId, status: 'VALIDATED' }, select: { totalAmount: true } }),
      this.prisma.invoice.findMany({
        where: { companyId },
        select: { totalAmount: true, amountPaid: true, status: true, dueDate: true },
      }),
    ]);

    const revenueValidated = validatedSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalInvoiced = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
    const totalCollected = invoices.reduce((sum, i) => sum + i.amountPaid, 0);
    const outstandingBalance = invoices
      .filter((i) => i.status !== 'PAID')
      .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);

    const overdue = invoices.filter((i) => i.status !== 'PAID' && i.dueDate && i.dueDate < now);
    const overdueCount = overdue.length;
    const overdueAmount = overdue.reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);

    return { revenueValidated, totalInvoiced, totalCollected, outstandingBalance, overdueCount, overdueAmount };
  }

  private async getTrend(companyId: string) {
    const since = new Date();
    since.setDate(since.getDate() - 13);
    since.setHours(0, 0, 0, 0);

    const [invoices, payments] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { companyId, issuedAt: { gte: since } },
        select: { totalAmount: true, issuedAt: true },
      }),
      this.prisma.payment.findMany({
        where: { companyId, paidAt: { gte: since } },
        select: { amount: true, paidAt: true },
      }),
    ]);

    const days: Date[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }

    return days.map((day) => {
      const next = new Date(day);
      next.setDate(next.getDate() + 1);
      const invoiced = invoices
        .filter((i) => i.issuedAt >= day && i.issuedAt < next)
        .reduce((s, i) => s + i.totalAmount, 0);
      const collected = payments
        .filter((p) => p.paidAt >= day && p.paidAt < next)
        .reduce((s, p) => s + p.amount, 0);
      return { day: day.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }), invoiced, collected };
    });
  }

  private async getOverdueInvoices(companyId: string) {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { not: 'PAID' }, dueDate: { lt: now } },
      orderBy: { dueDate: 'asc' },
    });

    return invoices.map((i) => ({
      id: i.id,
      ref: i.ref,
      customerName: i.customerName,
      totalAmount: i.totalAmount,
      amountPaid: i.amountPaid,
      balance: i.totalAmount - i.amountPaid,
      dueDate: i.dueDate,
      daysLate: Math.floor((now.getTime() - (i.dueDate as Date).getTime()) / (24 * 60 * 60 * 1000)),
    }));
  }

  private async getTopDebtors(companyId: string) {
    const invoices = await this.prisma.invoice.findMany({
      where: { companyId, status: { not: 'PAID' } },
      select: { customerName: true, totalAmount: true, amountPaid: true },
    });

    // Regroupé par nom (et non par customerId, qui peut être absent pour un client "au comptoir"
    // saisi librement) — deux clients de passage avec le même nom saisi fusionnent dans le
    // classement, limite acceptée d'une saisie sans identifiant.
    const byCustomer = new Map<string, { customerName: string; balance: number }>();
    for (const i of invoices) {
      const balance = i.totalAmount - i.amountPaid;
      const existing = byCustomer.get(i.customerName);
      if (existing) {
        existing.balance += balance;
      } else {
        byCustomer.set(i.customerName, { customerName: i.customerName, balance });
      }
    }

    return Array.from(byCustomer.values())
      .sort((a, b) => b.balance - a.balance)
      .slice(0, 5);
  }

  private async getRecentPayments(companyId: string) {
    const payments = await this.prisma.payment.findMany({
      where: { companyId },
      include: {
        invoice: { select: { ref: true, customerName: true } },
        receivedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { paidAt: 'desc' },
      take: 8,
    });

    return payments.map((p) => ({
      id: p.id,
      invoiceRef: p.invoice.ref,
      customerName: p.invoice.customerName,
      amount: p.amount,
      method: p.method,
      paidAt: p.paidAt,
      receivedBy: p.receivedBy ? `${p.receivedBy.firstName} ${p.receivedBy.lastName}` : 'Système',
    }));
  }

  private async getInvoicesByStatus(companyId: string) {
    const grouped = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { companyId },
      _count: { _all: true },
    });

    const counts = { UNPAID: 0, PARTIALLY_PAID: 0, PAID: 0 };
    for (const g of grouped) {
      if (g.status in counts) counts[g.status as keyof typeof counts] = g._count._all;
    }
    return counts;
  }
}
