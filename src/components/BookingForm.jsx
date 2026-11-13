import { useState } from 'react';
import { motion } from 'framer-motion';
import { PhoneCall, MessageCircle } from 'lucide-react';
import { business } from '../config/business';

function BookingForm() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    location: '',
    tankers: '1 Tanker',
    tankerType: 'Normal',
    date: '',
    requirements: '',
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors((prev) => ({ ...prev, [e.target.name]: '' }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const nextErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Please enter your name.';
    if (!form.phone.trim()) nextErrors.phone = 'Please enter your phone number.';
    if (!form.location.trim()) nextErrors.location = 'Please enter the delivery location.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    const formatDisplayDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    };

    const message = `Hello Rajindera Water Tanker,\nI would like to book a water tanker.\n\nName: ${form.name}\nPhone: ${form.phone}\nLocation: ${form.location}\nNumber of Tankers: ${form.tankers}\nTanker Type: ${form.tankerType}\nPreferred Date: ${form.date ? formatDisplayDate(form.date) : 'Not specified'}\nRequirements: ${form.requirements || 'None'}`;
    window.open(`https://wa.me/919814361579?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
    setSubmitted(true);
    setForm({ name: '', phone: '', location: '', tankers: '1 Tanker', tankerType: 'Normal', date: '', requirements: '' });
  };

  return (
    <section id="booking" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-8 rounded-[32px] border border-slate-200 bg-white p-8 shadow-soft lg:grid-cols-[0.9fr_1.1fr] lg:p-12">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">Need a Water Tanker?</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">Contact {business.name} to check availability and delivery timing.</h2>
          <p className="mt-4 text-lg leading-8 text-slate-600">Share your delivery location and requirements and we will help you with availability, pricing and expected delivery time.</p>
          <div className="mt-8 space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-6">
            <a href={business.phoneHref} className="flex items-center gap-3 text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white"><PhoneCall size={18} /></div>
              <div>
                <p className="text-sm text-slate-500">Call Now</p>
                <p className="font-semibold">{business.phone}</p>
              </div>
            </a>
            <a href={business.whatsappHref} target="_blank" rel="noreferrer" className="flex items-center gap-3 text-slate-900">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500 text-white"><MessageCircle size={18} /></div>
              <div>
                <p className="text-sm text-slate-500">Book on WhatsApp</p>
                <p className="font-semibold">+91 98143 61579</p>
              </div>
            </a>
          </div>
        </div>

        <motion.form initial={{ opacity: 0, y: 14 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} onSubmit={handleSubmit} className="rounded-[24px] border border-slate-200 bg-slate-50 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Name
              <input name="name" value={form.name} onChange={handleChange} placeholder="Your name" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" />
              {errors.name && <span className="mt-1 block text-sm text-rose-600">{errors.name}</span>}
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Phone Number
              <input name="phone" value={form.phone} onChange={handleChange} placeholder="Your phone number" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" />
              {errors.phone && <span className="mt-1 block text-sm text-rose-600">{errors.phone}</span>}
            </label>
          </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Delivery Location
            <input name="location" value={form.location} onChange={handleChange} placeholder="Sector, area or full address" className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" />
            {errors.location && <span className="mt-1 block text-sm text-rose-600">{errors.location}</span>}
          </label>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-semibold text-slate-700">
                Number of Tankers
                <select name="tankers" value={form.tankers} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0">
                  <option>1 Tanker</option>
                  <option>2 Tankers</option>
                  <option>3 Tankers</option>
                  <option>4 Tankers</option>
                  <option>5+ Tankers</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Tanker Type
                <select name="tankerType" value={form.tankerType} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0">
                  <option value="Normal">Normal</option>
                  <option value="Motor">Motor</option>
                </select>
              </label>

              <label className="text-sm font-semibold text-slate-700">
                Preferred Date
                <input name="date" type="date" value={form.date} onChange={handleChange} className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" />
              </label>
            </div>

          <label className="mt-4 block text-sm font-semibold text-slate-700">
            Requirements
            <textarea name="requirements" value={form.requirements} onChange={handleChange} placeholder="Any specific instructions..." className="mt-2 min-h-[120px] w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none ring-0" />
          </label>

          <div className="mt-6 flex flex-wrap gap-3">
            <button type="submit" className="rounded-full bg-blue-600 px-5 py-3.5 font-semibold text-white shadow-soft transition hover:bg-blue-700">
              Request Water Tanker
            </button>
            <a href={business.phoneHref} className="rounded-full border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 transition hover:border-blue-200 hover:text-blue-600">
              Call Now
            </a>
          </div>
          {submitted && <p className="mt-4 text-sm font-medium text-emerald-600">Your request has been prepared for WhatsApp.</p>}
        </motion.form>
      </div>
    </section>
  );
}

export default BookingForm;
