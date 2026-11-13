import { motion } from 'framer-motion';
import { Star } from 'lucide-react';
import { reviews } from '../config/reviews';
import { business } from '../config/business';

function Reviews() {
  return (
    <section id="reviews" className="px-4 py-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-blue-600">What Customers Say</p>
          <h2 className="mt-4 font-display text-3xl font-semibold text-slate-900 sm:text-4xl">{business.rating} Google Rating</h2>
          <p className="mt-4 text-lg text-slate-600">Based on {business.reviews} reviews.</p>
        </div>
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {reviews.map((review, index) => (
            <motion.article key={review.name} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.35, delay: index * 0.06 }} className="rounded-[24px] border border-slate-200 bg-white p-7 shadow-soft">
              <div className="flex items-center gap-1 text-amber-400">
                {Array.from({ length: review.rating }).map((_, idx) => <Star key={`${review.name}-${idx}`} size={16} fill="currentColor" />)}
              </div>
              <h3 className="mt-4 text-xl font-semibold text-slate-900">{review.name}</h3>
              <p className="mt-2 text-slate-600">Local Google review.</p>
            </motion.article>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <a href="https://maps.google.com/?q=Rajindera+Water+Tanker+Chandigarh" target="_blank" rel="noreferrer" className="rounded-full border border-slate-200 bg-white px-5 py-3.5 font-semibold text-slate-700 shadow-sm transition hover:border-blue-200 hover:text-blue-600">
            View on Google Maps
          </a>
        </div>
      </div>
    </section>
  );
}

export default Reviews;
