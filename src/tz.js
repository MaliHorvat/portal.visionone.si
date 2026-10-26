// Field računa »danes«, termine in datume v slovenskem času. Vercel teče v UTC (TZ tam ni nastavljiv),
// zato pas nastavimo ob zagonu, preden se uporabi kateri koli Date.
if (!process.env.TZ || process.env.TZ === 'UTC' || process.env.TZ === ':UTC') process.env.TZ = 'Europe/Ljubljana';
