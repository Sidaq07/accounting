import { motion } from 'framer-motion';
import { ArrowRight, MapPin, PhoneCall, MessageCircle } from 'lucide-react';
import { business } from '../config/business';

function Contact() {
  return (
    <section id="contact" className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl rounded-[32px] border border-slate-200 bg-gradient-to-br from-slate-900 to-blue-900 p-8 text-white shadow-soft lg:p-12">
        <div className="grid gap-10 lg:grid-cols-[1fr_0.9fr]">
          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }}>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-sky-300">Contact Us</p>
            <h2 className="mt-4 font-display text-3xl font-semibold sm:text-4xl">Get in touch to check availability and make a booking.</h2>
            <p className="mt-4 max-w-xl text-lg text-slate-300">{business.name} is ready to help with scheduled and urgent water deliveries in Chandigarh and nearby areas.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={business.phoneHref} className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3.5 font-semibold text-slate-900 transition hover:bg-slate-100">
                <PhoneCall size={18} />
                Call Now
              </a>
              <a href={business.whatsappHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-400 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10">
                <MessageCircle size={18} />
                WhatsApp
              </a>
              <a href={business.googleMapsHref} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-slate-400 px-5 py-3.5 font-semibold text-white transition hover:bg-white/10">
                <MapPin size={18} />
                Directions
              </a>
            </div>
            <div className="mt-8 rounded-[24px] border border-white/10 bg-white/10 p-6 backdrop-blur">
              <p className="text-sm uppercase tracking-[0.24em] text-slate-300">Phone</p>
              <a href={business.phoneHref} className="mt-2 inline-flex text-2xl font-semibold text-white">{business.phone}</a>
              <p className="mt-6 text-sm uppercase tracking-[0.24em] text-slate-300">Address</p>
              <p className="mt-2 text-lg text-slate-200">{business.fullAddress}</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} className="overflow-hidden rounded-[24px] border border-white/10 bg-white/10 p-2 backdrop-blur">
            <iframe title="Location map" src="https://www.google.com/maps?q=Sector%2048C%20Chandigarh&z=13&output=embed" loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-[360px] w-full rounded-[20px] border-0" />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default Contact;
