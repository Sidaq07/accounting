import { motion } from 'framer-motion';
import { MapPin, PhoneCall, Truck } from 'lucide-react';
import { business } from '../config/business';

const cards = [
  {
    title: 'Call Us',
    value: business.phone,
    action: 'Call Now',
    href: business.phoneHref,
    icon: PhoneCall,
  },
  {
    title: 'Location',
    value: business.address,
    action: 'Get Directions',
    href: business.googleMapsHref,
    icon: MapPin,
  },
];

function QuickContact() {
  return (
    <section className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-2">
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <motion.article
              key={card.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.35, delay: index * 0.08 }}
              className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-soft"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
                <Icon size={20} />
              </div>
              <h3 className="text-xl font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 text-slate-600">{card.value}</p>
              <a href={card.href} target={card.href.startsWith('http') ? '_blank' : undefined} rel={card.href.startsWith('http') ? 'noreferrer' : undefined} className="mt-5 inline-flex items-center font-semibold text-blue-600 transition hover:text-blue-700">
                {card.action}
              </a>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

export default QuickContact;
