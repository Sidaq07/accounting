import { MessageCircle, PhoneCall } from 'lucide-react';

function FloatingContactButtons() {
  return (
    <div className="floating-actions">
      <a href="https://wa.me/919814361579" target="_blank" rel="noreferrer" className="contact-whatsapp" aria-label="WhatsApp">
        <MessageCircle size={18} style={{ marginRight: 10 }} />
        WhatsApp
      </a>
      <a href="tel:+919814361579" className="contact-call" aria-label="Call Now">
        <PhoneCall size={18} style={{ marginRight: 10 }} />
        Call Now
      </a>
    </div>
  );
}

export default FloatingContactButtons;
