import { NextResponse } from 'next/server';
import { getBillingData } from '@/app/(generador)/services/billing/getBillingData';

export async function GET() {
  try {
    const billingData = await getBillingData();

    if (!billingData) {
      return NextResponse.json(
        { error: 'No se encontraron datos de facturación' },
        { status: 404 }
      );
    }

    return NextResponse.json(billingData);
  } catch (error) {
    console.error('Error al obtener datos de facturación:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de facturación' },
      { status: 500 }
    );
  }
}

