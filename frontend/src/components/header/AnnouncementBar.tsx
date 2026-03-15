import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../services/api";

const FALLBACK_MESSAGES = [
  {
    text: "Free delivery on orders above KSh 5,000",
    link: "/shop",
    linkLabel: "Shop Now →",
  },
  {
    text: "New arrivals dropping every week",
    link: "/shop?sort=latest",
    linkLabel: "Explore Now →",
  },
  {
    text: "Use code URBAN10 for 10% off your first order",
    link: "/shop",
    linkLabel: "Shop Now →",
  },
  {
    text: "Gift cards available — perfect for every occasion",
    link: "/shop",
    linkLabel: "Get One →",
  },
];

const INTERVAL_MS = 4000;

export default function AnnouncementBar() {
  const [messages, setMessages] = useState(FALLBACK_MESSAGES);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    api
      .get("/api/v1/admin/settings/public")
      .then((r) => {
        const msgs = r.data?.announcement_messages;
        if (Array.isArray(msgs) && msgs.length > 0) {
          setMessages(msgs);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setIndex((i) => (i + 1) % messages.length);
        setFading(false);
      }, 300);
    }, INTERVAL_MS);
    return () => clearInterval(timer);
  }, [messages.length]);

  if (!visible) return null;

  const goTo = (next: number) => {
    setFading(true);
    setTimeout(() => {
      setIndex(((next % messages.length) + messages.length) % messages.length);
      setFading(false);
    }, 200);
  };

  const msg = messages[index];

  return (
    <div className="bg-maroon-700 text-white text-xs font-manrope relative flex items-center justify-center px-8 py-2 select-none">
      {/* Prev */}
      <button
        onClick={() => goTo(index - 1)}
        className="absolute left-3 p-0.5 text-white/70 hover:text-white transition-colors"
        aria-label="Previous message"
      >
        <ChevronLeft size={14} />
      </button>

      {/* Message */}
      <span
        className="text-center transition-opacity duration-300"
        style={{ opacity: fading ? 0 : 1 }}
      >
        {msg.text}&nbsp;&mdash;&nbsp;
        <Link
          to={msg.link}
          className="underline underline-offset-2 hover:text-maroon-200 transition-colors font-semibold"
        >
          {msg.linkLabel}
        </Link>
      </span>

      {/* Next */}
      <button
        onClick={() => goTo(index + 1)}
        className="absolute right-8 p-0.5 text-white/70 hover:text-white transition-colors"
        aria-label="Next message"
      >
        <ChevronRight size={14} />
      </button>

      {/* Dismiss */}
      <button
        onClick={() => setVisible(false)}
        className="absolute right-2 p-1 text-white/60 hover:text-white transition-colors"
        aria-label="Close announcement"
      >
        <X size={13} />
      </button>
    </div>
  );
}
