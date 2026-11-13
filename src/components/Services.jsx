import { motion } from 'framer-motion';
import { services } from '../config/services';
import { business } from '../config/business';

function Services() {
  return (
    <section id="services" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Our Services</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Professional water delivery for all your requirements.</h2>
          <p className="mt-4 text-lg text-slate-600">Serving Chandigarh, Mohali and nearby areas with dependable tanker access.</p>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.article
                key={service.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.15 }}
                transition={{ duration: 0.35, delay: index * 0.06 }}
                whileHover={{ y: -4, scale: 1.01 }}
                className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-soft"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-blue-600">
                  <Icon size={20} />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{service.title}</h3>
                <p className="mt-3 text-slate-600">{service.description}</p>
              </motion.article>
            );
          })}
        </div>
        <div className="mt-12 flex justify-center">
          <a href={business.phoneHref} className="rounded-full bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-soft transition hover:bg-blue-700">
            Call to Check Availability
          </a>
        </div>
      </div>
    </section>
  );
}

export default Services;
