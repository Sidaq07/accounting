import { motion } from 'framer-motion';
import { Compass, MessageCircleMore, Truck, Star } from 'lucide-react';
import { business } from '../config/business';

const reasons = [
  { title: 'Local Chandigarh Service', description: 'Serving customers in Chandigarh and nearby areas.', icon: Compass },
  { title: 'Easy Booking', description: 'Customers can directly call for availability and booking.', icon: MessageCircleMore },
  { title: 'Convenient Delivery', description: 'Water tanker delivery directly to the required location.', icon: Truck },
  { title: 'Customer Rated', description: `${business.rating} based on ${business.reviews} Google reviews.`, icon: Star },
];

function WhyChooseUs() {
  return (
    <section id="why-choose-us" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Why Choose Us</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Why Choose {business.name}?</h2>
          <p className="mt-4 text-lg text-slate-600">A reliable local service focused on simple booking and prompt delivery.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {reasons.map((reason, index) => {
            const Icon = reason.icon;
            return (
              <motion.article key={reason.title} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.06 }} className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-soft">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{reason.title}</h3>
                <p className="mt-3 text-slate-600">{reason.description}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default WhyChooseUs;
