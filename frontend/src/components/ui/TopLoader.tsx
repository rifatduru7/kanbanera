import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const TopLoader = () => {
  const location = useLocation();
  const [isLoaderVisible, setIsLoaderVisible] = useState(false);

  useEffect(() => {
    setIsLoaderVisible(true);
    const timer = setTimeout(() => setIsLoaderVisible(false), 500);
    return () => clearTimeout(timer);
  }, [location.pathname]);

  return (
    <AnimatePresence>
      {isLoaderVisible && (
        <motion.div
          initial={{ width: 0, opacity: 1 }}
          animate={{ width: '100%', opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed top-0 left-0 h-[3px] bg-gradient-to-r from-primary/50 via-primary to-primary-focus z-[9999] shadow-[0_0_10px_rgba(40,170,226,0.5)]"
        />
      )}
    </AnimatePresence>
  );
};
