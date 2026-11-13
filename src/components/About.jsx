import { motion } from 'framer-motion';
import { ArrowRight, Droplets } from 'lucide-react';
import { business } from '../config/business';

function About() {
  return (
    <section id="about" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl items-center gap-10 rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft lg:grid-cols-[0.95fr_1.05fr] lg:p-12">
        <motion.div initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }} className="overflow-hidden rounded-[24px]">
          <img src="https://images.unsplash.com/photo-1570129477492-45c003edd2be?auto=format&fit=crop&w=1000&q=80" alt="Water tanker service in Chandigarh" className="h-[360px] w-full object-cover" />
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm font-semibold text-blue-700">
            <Droplets size={16} />
            Trusted local business
          </div>
          <h2 className="font-display text-3xl font-semibold text-slate-900 sm:text-4xl">About {business.name}</h2>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {business.name} provides dependable water tanker delivery services across Chandigarh and nearby areas, including Mohali.
          </p>
          <p className="mt-4 text-lg leading-8 text-slate-600">
            Customers can contact us for residential, commercial, construction and general water requirements. We focus on clear communication, fast availability checks and simple booking.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

export default About;
