import { motion } from 'framer-motion';
import { ArrowRight, BadgeCheck, MapPin, Star } from 'lucide-react';
import { business } from '../config/business';

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden px-4 pb-20 pt-10 sm:px-6 lg:px-8 lg:pt-20">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.16),_transparent_32%),linear-gradient(135deg,_#f8fbff_0%,_#eff8ff_100%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-100 bg-white/80 px-3 py-2 text-sm font-medium text-blue-700 shadow-sm">
            <BadgeCheck size={16} />
            {business.statusLabel}
          </div>
          <h1 className="max-w-3xl font-display text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Reliable Water Tanker Service in Chandigarh
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-slate-600 sm:text-xl">
            Fast and dependable water tanker delivery for homes, businesses, construction sites and other water requirements.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={business.phoneHref} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-soft transition hover:bg-blue-700">
              Call Now
              <ArrowRight size={18} />
            </a>
            <a href="#booking" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
              Book a Tanker
            </a>
          </div>
          <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"><Star size={15} className="text-amber-400" /> {business.rating} Google Rating</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"><MapPin size={15} className="text-blue-600" /> Sector 48C, Chandigarh</span>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2"><BadgeCheck size={15} className="text-emerald-500" /> Open for Bookings</span>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08 }} className="relative">
          <div className="absolute -left-3 top-8 hidden rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-700 shadow-soft lg:block">
            Fast response
          </div>
          <div className="absolute -right-2 bottom-10 hidden rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-soft lg:block">
            Booking available
          </div>
          <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-white p-2 shadow-2xl">
            <img
              src="/images/hero.jpeg"
              alt="Rajindera Water Tanker hero image"
              className="h-[480px] w-full rounded-[24px] object-cover"
            />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default Hero;
