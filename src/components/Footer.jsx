import { Link } from 'react-router-dom';
import { business } from '../config/business';

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-end md:justify-between">
        <div>
          <a className="flex items-center gap-3" href="#home">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-lg font-semibold text-white">R</div>
            <div>
              <p className="font-semibold text-slate-900">{business.name}</p>
              <p className="text-sm text-slate-500">Reliable Water Tanker Service in Chandigarh</p>
            </div>
          </a>
          <p className="mt-4 text-slate-600">{business.phone}</p>
          <p className="text-slate-600">{business.fullAddress}</p>
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          <a href="#home" className="transition hover:text-blue-600">Home</a>
          <a href="#services" className="transition hover:text-blue-600">Services</a>
          <a href="#about" className="transition hover:text-blue-600">About</a>
          <a href="#reviews" className="transition hover:text-blue-600">Reviews</a>
          <a href="#contact" className="transition hover:text-blue-600">Contact</a>
          <Link to="/login" className="font-medium text-blue-600 transition hover:text-blue-700">Admin Portal</Link>
        </div>
        <div className="text-sm text-slate-600">
          <p>© 2026 {business.name}. All Rights Reserved.</p>
          <p className="mt-1 font-semibold text-slate-700">Open • Currently Providing Service</p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
