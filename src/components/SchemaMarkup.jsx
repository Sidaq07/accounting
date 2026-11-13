import { business } from '../config/business';

function SchemaMarkup() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.type,
    telephone: business.phoneHref.replace('tel:', '+91' + business.phone.replace(/\s+/g, '')), 
    address: {
      '@type': 'PostalAddress',
      streetAddress: 'Pind Jagatpura, Sector 48C',
      addressLocality: 'Chandigarh',
      addressRegion: 'Chandigarh',
      postalCode: '160047',
    },
    areaServed: business.serviceAreas,
    url: 'https://example.com',
    priceRange: '₹₹',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      description: business.statusLabel,
    },
  };

  return (
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  );
}

export default SchemaMarkup;
