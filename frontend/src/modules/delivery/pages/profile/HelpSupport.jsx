import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MessageCircle,
  Phone,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Button from "@/shared/components/ui/Button";
import Card from "@/shared/components/ui/Card";
import { motion, AnimatePresence } from "framer-motion";
import axiosInstance from "@core/api/axios";

const FAQ_CACHE_KEY = 'delivery_faqs_cache_v1';
const FAQ_CACHE_TTL_MS = 5 * 60 * 1000;

const HelpSupport = () => {
  const navigate = useNavigate();

  const [faqs, setFaqs] = useState([]);
  const [openIndex, setOpenIndex] = useState(null);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchFaqs = async () => {
      try {
        const cached = sessionStorage.getItem(FAQ_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          const isFresh = parsed?.ts && Date.now() - parsed.ts < FAQ_CACHE_TTL_MS;
          if (isFresh && Array.isArray(parsed?.items)) {
            setFaqs(parsed.items);
            setLoading(false);
            return;
          }
        }
      } catch {
        // ignore cache error
      }

      try {
        const response = await axiosInstance.get('/public/faqs', {
          params: { category: 'Delivery', status: 'published' }
        });
        const data = response.data?.result ?? response.data;
        const list = Array.isArray(data?.items) ? data.items : Array.isArray(data?.results) ? data.results : [];
        setFaqs(list);
        sessionStorage.setItem(
          FAQ_CACHE_KEY,
          JSON.stringify({ ts: Date.now(), items: list })
        );
      } catch (error) {
        console.error('Error fetching delivery FAQs:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchFaqs();
  }, []);

  const toggleAccordion = (index) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="flex items-center p-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors mr-2">
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <h1 className="ds-h3 text-gray-900">Help & Support</h1>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {/* Support Channels */}
        <section className="grid grid-cols-2 gap-4">
          <Card className="p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-3">
              <MessageCircle size={24} />
            </div>
            <h4 className="font-bold text-gray-800">Chat Support</h4>
            <p className="text-xs text-gray-500 mt-1">Wait time: ~2 mins</p>
          </Card>
          <Card className="p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 mb-3">
              <Phone size={24} />
            </div>
            <h4 className="font-bold text-gray-800">Call Support</h4>
            <p className="text-xs text-gray-500 mt-1">Available 24/7</p>
          </Card>
        </section>

        {/* FAQs */}
        <section>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <HelpCircle size={20} className="mr-2 text-primary" /> Frequently
            Asked Questions
          </h2>
          <div className="space-y-3">
            {loading ? (
              <div className="text-center text-sm text-gray-400 py-4">Loading FAQs...</div>
            ) : faqs.length > 0 ? (
              faqs.map((faq, index) => (
                <Card
                  key={faq._id || index}
                  className="overflow-hidden cursor-pointer"
                  onClick={() => toggleAccordion(index)}>
                  <div className="p-4 flex justify-between items-center bg-white">
                    <h4 className="font-medium text-gray-800 text-sm pr-4">
                      {faq.question}
                    </h4>
                    {openIndex === index ? (
                      <ChevronUp size={18} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={18} className="text-gray-400" />
                    )}
                  </div>
                  <AnimatePresence>
                    {openIndex === index && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-gray-50">
                        <div className="p-4 text-sm text-gray-600 border-t border-gray-100 leading-relaxed">
                          {faq.answer}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              ))
            ) : (
              <div className="text-center text-sm text-gray-400 py-4 border rounded-xl bg-white border-gray-100">
                No FAQs available at the moment.
              </div>
            )}
          </div>
        </section>

        <div className="text-center pt-8">
          <p className="text-gray-500 text-sm">Still need help?</p>
          <Button variant="link" className="text-primary font-bold">
            View All FAQs
          </Button>
        </div>
      </div>
    </div>
  );
};

export default HelpSupport;
