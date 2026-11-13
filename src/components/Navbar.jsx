import { useEffect, useState } from 'react';
import { Menu, X, PhoneCall } from 'lucide-react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { business } from '../config/business';

const links = [
  { label: 'Home', href: '#home' },
  { label: 'About', href: '#about' },
  { label: 'Services', href: '#services' },
  { label: 'Why Choose Us', href: '#why-choose-us' },
  { label: 'Reviews', href: '#reviews' },
  { label: 'Service Areas', href: '#service-areas' },
  { label: 'Contact', href: '#contact' },
];

function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 12));

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <motion.header
      className={`sticky top-0 z-50 w-full transition-all ${scrolled ? 'bg-white/90 shadow-sm backdrop-blur-xl' : 'bg-transparent'}`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <a href="#home" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-lg font-semibold text-white shadow-soft">
            R
          </div>
          <div>
            <p className="font-semibold text-slate-900">{business.name}</p>
            <p className="text-sm text-slate-500">Water Delivery in Chandigarh</p>
          </div>
        </a>

        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 lg:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition hover:text-blue-600">
              {link.label}
            </a>
          ))}
        </nav>

        <a href={business.phoneHref} className="hidden items-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-700 lg:inline-flex">
          <PhoneCall size={16} />
          Call Now
        </a>

        <button className="rounded-full border border-slate-200 bg-white/80 p-2.5 text-slate-700 lg:hidden" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
          {open ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white/95 px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-3 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <a key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-2 py-2 hover:bg-slate-50">
                {link.label}
              </a>
            ))}
            <a href={business.phoneHref} className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-blue-600 px-4 py-2.5 font-semibold text-white">
              <PhoneCall size={16} />
              Call Now
            </a>
          </nav>
        </div>
      )}
    </motion.header>
  );
}

export default Navbar;
