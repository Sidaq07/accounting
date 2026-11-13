import { Helmet } from 'react-helmet-async';
import { business } from '../config/business';

function SEO() {
  return (
    <Helmet>
      <title>{business.seoTitle}</title>
      <meta name="description" content={business.seoDescription} />
      <meta name="keywords" content={business.keywords.join(', ')} />
      <link rel="canonical" href="https://example.com" />
      <meta property="og:title" content={business.seoTitle} />
      <meta property="og:description" content={business.seoDescription} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={business.seoTitle} />
      <meta name="twitter:description" content={business.seoDescription} />
    </Helmet>
  );
}

export default SEO;
