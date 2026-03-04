import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const jobId = body?.jobId;
    const claimantId = body?.claimantId || '';

    if (!jobId) {
      return res.status(400).json({ error: 'Missing jobId' });
    }

    const origin = req.headers.origin || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: 'price_1...your_5_dollar_price_id...',
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${origin}/?success=true&jobId=${jobId}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        jobId,
        claimantId,
      },
    });

    return res.status(200).json({ sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    return res.status(500).json({ error: 'Unable to create checkout session' });
  }
}
