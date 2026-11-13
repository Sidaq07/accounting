import { motion } from 'framer-motion';
import { areas } from '../config/areas';
import { business } from '../config/business';

function ServiceAreas() {
  return (
    <section id="service-areas" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft lg:p-12">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Service Areas</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Water Tanker Service Areas</h2>
          <p className="mt-4 text-lg text-slate-600">Delivering to various locations across Chandigarh, Mohali and nearby areas.</p>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {areas.map((area, index) => (
            <motion.div key={area} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.3, delay: index * 0.04 }} className="rounded-[20px] border border-slate-200 bg-slate-50 px-5 py-4 text-center font-semibold text-slate-700">
              {area}
            </motion.div>
          ))}
        </div>
        <div className="mt-10 text-center text-slate-600">
          Not sure if we deliver to your location? Call us at <a href={business.phoneHref} className="font-semibold text-blue-600">{business.phone}</a>.
        </div>
      </div>
    </section>
  );
}

export default ServiceAreas;
